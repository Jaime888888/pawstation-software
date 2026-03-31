import tkinter as tk
from tkinter import messagebox

import customtkinter as ctk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

from api import PawStationAPI, PawStationAPIError
from chart import build_daily_figure
from config import load_config, save_config

ctk.set_appearance_mode("system")
ctk.set_default_color_theme("blue")


class PawStationApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("PawStation Desktop Client")
        self.geometry("950x720")
        self.cfg = load_config()
        self.api = None
        self.job = None
        self.entries = []
        self.canvas = None
        self.build_ui()
        saved_ip = self.cfg.get("pi_ip", "")
        if saved_ip:
            self.ip_entry.insert(0, saved_ip)

    def build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        top = ctk.CTkFrame(self)
        top.grid(row=0, column=0, padx=16, pady=16, sticky="ew")
        top.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(top, text="Pi IP").grid(row=0, column=0, padx=8, pady=8)
        self.ip_entry = ctk.CTkEntry(top, placeholder_text="192.168.1.50")
        self.ip_entry.grid(row=0, column=1, padx=8, pady=8, sticky="ew")
        ctk.CTkButton(top, text="Connect", command=self.connect).grid(row=0, column=2, padx=8, pady=8)
        self.status_label = ctk.CTkLabel(top, text="Not connected")
        self.status_label.grid(row=1, column=0, columnspan=3, padx=8, pady=(0, 8), sticky="w")

        body = ctk.CTkFrame(self)
        body.grid(row=1, column=0, padx=16, pady=(0, 16), sticky="nsew")
        body.grid_columnconfigure((0, 1), weight=1)
        body.grid_rowconfigure(1, weight=1)

        left = ctk.CTkFrame(body)
        left.grid(row=0, column=0, padx=(10, 5), pady=10, sticky="nsew")
        right = ctk.CTkFrame(body)
        right.grid(row=0, column=1, padx=(5, 10), pady=10, sticky="nsew")
        bottom = ctk.CTkFrame(body)
        bottom.grid(row=1, column=0, columnspan=2, padx=10, pady=(0, 10), sticky="nsew")
        bottom.grid_rowconfigure(1, weight=1)
        bottom.grid_columnconfigure(0, weight=1)

        self.bowl = tk.StringVar(value="--")
        self.tank = tk.StringVar(value="--")
        self.feed_time = tk.StringVar(value="--")
        self.amount = tk.StringVar(value="--")
        self.state = tk.StringVar(value="--")
        self.device_time = tk.StringVar(value="--")

        stats = [
            ("Bowl", self.bowl),
            ("Tank", self.tank),
            ("Feed time", self.feed_time),
            ("Amount", self.amount),
            ("State", self.state),
            ("Device time", self.device_time),
        ]
        for i, (name, var) in enumerate(stats):
            card = ctk.CTkFrame(left)
            card.grid(row=i // 2, column=i % 2, padx=8, pady=8, sticky="nsew")
            ctk.CTkLabel(card, text=name).pack(anchor="w", padx=10, pady=(10, 2))
            ctk.CTkLabel(card, textvariable=var, font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=10, pady=(0, 10))

        self.feed_btn = ctk.CTkButton(right, text="Manual Feed", command=self.manual_feed, state="disabled")
        self.feed_btn.pack(fill="x", padx=10, pady=(12, 8))
        self.hour_entry = ctk.CTkEntry(right, placeholder_text="Hour 0-23")
        self.hour_entry.pack(fill="x", padx=10, pady=6)
        self.min_entry = ctk.CTkEntry(right, placeholder_text="Minute 0-59")
        self.min_entry.pack(fill="x", padx=10, pady=6)
        self.time_btn = ctk.CTkButton(right, text="Save Time", command=self.save_time, state="disabled")
        self.time_btn.pack(fill="x", padx=10, pady=6)
        self.amount_entry = ctk.CTkEntry(right, placeholder_text="Target grams 10-1000")
        self.amount_entry.pack(fill="x", padx=10, pady=6)
        self.amount_btn = ctk.CTkButton(right, text="Save Amount", command=self.save_amount, state="disabled")
        self.amount_btn.pack(fill="x", padx=10, pady=6)
        self.feedback = ctk.CTkLabel(right, text="")
        self.feedback.pack(fill="x", padx=10, pady=12)

        header = ctk.CTkFrame(bottom)
        header.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        ctk.CTkLabel(header, text="History days").pack(side="left", padx=8, pady=8)
        self.days_menu = ctk.CTkOptionMenu(header, values=["7", "14", "30"], command=lambda _: self.draw_chart())
        self.days_menu.set("7")
        self.days_menu.pack(side="left", padx=8, pady=8)
        self.refresh_btn = ctk.CTkButton(header, text="Refresh History", command=self.load_history, state="disabled")
        self.refresh_btn.pack(side="right", padx=8, pady=8)
        self.chart_frame = ctk.CTkFrame(bottom)
        self.chart_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        self.chart_frame.grid_rowconfigure(0, weight=1)
        self.chart_frame.grid_columnconfigure(0, weight=1)
        self.chart_placeholder = ctk.CTkLabel(self.chart_frame, text="Connect to load history")
        self.chart_placeholder.grid(row=0, column=0, padx=10, pady=10)

    def connect(self):
        ip = self.ip_entry.get().strip()
        if not ip:
            messagebox.showerror("Missing IP", "Enter the Raspberry Pi IP address.")
            return
        self.api = PawStationAPI(ip)
        self.cfg["pi_ip"] = ip
        save_config(self.cfg)
        try:
            self.refresh_status()
            self.load_history()
        except PawStationAPIError as exc:
            self.offline(str(exc))
            messagebox.showerror("Connection failed", str(exc))
            return
        self.status_label.configure(text=f"Connected to {ip}")
        self.time_btn.configure(state="normal")
        self.amount_btn.configure(state="normal")
        self.refresh_btn.configure(state="normal")
        self.start_polling()

    def start_polling(self):
        if self.job is not None:
            self.after_cancel(self.job)
        self.job = self.after(3000, self.poll)

    def poll(self):
        try:
            self.refresh_status()
        except PawStationAPIError as exc:
            self.offline(str(exc))
        self.start_polling()

    def refresh_status(self):
        if self.api is None:
            return
        data = self.api.get_status()
        bowl_g = float(data.get("bowl_g", 0))
        tank_g = float(data.get("tank_g", 0))
        feed_hour = int(data.get("feed_hour", 0))
        feed_min = int(data.get("feed_min", 0))
        target_g = float(data.get("target_g", 0))
        motor_on = bool(data.get("motor_on", False))
        self.bowl.set(f"{bowl_g:.1f} g")
        self.tank.set(f"{tank_g/1000:.2f} kg")
        self.feed_time.set(f"{feed_hour:02d}:{feed_min:02d}")
        self.amount.set(f"{target_g:.1f} g")
        self.state.set("Dispensing" if motor_on else str(data.get("state", "MAIN")))
        self.device_time.set(str(data.get("iso_time", "--")))
        self.hour_entry.delete(0, tk.END)
        self.hour_entry.insert(0, str(feed_hour))
        self.min_entry.delete(0, tk.END)
        self.min_entry.insert(0, str(feed_min))
        self.amount_entry.delete(0, tk.END)
        self.amount_entry.insert(0, str(int(target_g) if target_g.is_integer() else target_g))
        self.feed_btn.configure(state="disabled" if motor_on else "normal")
        if motor_on:
            self.feedback.configure(text="Dispensing in progress...")

    def load_history(self):
        if self.api is None:
            return
        data = self.api.get_daily()
        self.entries = data.get("entries", [])
        self.draw_chart()

    def draw_chart(self):
        if self.canvas is not None:
            self.canvas.get_tk_widget().destroy()
        if not self.entries:
            self.chart_placeholder.configure(text="No history available yet")
            return
        self.chart_placeholder.grid_forget()
        fig = build_daily_figure(self.entries, int(self.days_menu.get()))
        self.canvas = FigureCanvasTkAgg(fig, master=self.chart_frame)
        self.canvas.draw()
        self.canvas.get_tk_widget().grid(row=0, column=0, sticky="nsew", padx=10, pady=10)

    def manual_feed(self):
        if self.api is None:
            return
        try:
            self.api.dispense()
            self.feedback.configure(text="Manual dispense requested")
            self.refresh_status()
        except PawStationAPIError as exc:
            self.offline(str(exc))
            messagebox.showerror("Dispense failed", str(exc))

    def save_time(self):
        if self.api is None:
            return
        try:
            hour = int(self.hour_entry.get().strip())
            minute = int(self.min_entry.get().strip())
        except ValueError:
            messagebox.showerror("Invalid time", "Use whole numbers for hour and minute.")
            return
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            messagebox.showerror("Invalid time", "Hour must be 0-23 and minute 0-59.")
            return
        try:
            self.api.update_settings(feed_hour=hour, feed_min=minute)
            self.feedback.configure(text=f"Saved feed time {hour:02d}:{minute:02d}")
            self.refresh_status()
        except PawStationAPIError as exc:
            self.offline(str(exc))
            messagebox.showerror("Time update failed", str(exc))

    def save_amount(self):
        if self.api is None:
            return
        try:
            amount = float(self.amount_entry.get().strip())
        except ValueError:
            messagebox.showerror("Invalid amount", "Amount must be a number.")
            return
        if not (10 <= amount <= 1000):
            messagebox.showerror("Invalid amount", "Amount must be between 10 and 1000 grams.")
            return
        try:
            self.api.update_settings(target_g=amount)
            self.feedback.configure(text=f"Saved target amount {amount:.1f} g")
            self.refresh_status()
        except PawStationAPIError as exc:
            self.offline(str(exc))
            messagebox.showerror("Amount update failed", str(exc))

    def offline(self, message):
        self.status_label.configure(text="Device offline")
        self.feed_btn.configure(state="disabled")
        self.feedback.configure(text=message)

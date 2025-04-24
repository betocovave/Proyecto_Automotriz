import customtkinter as ct
from customtkinter import *
from tkinter import filedialog, messagebox, simpledialog, ttk
import sqlite3
from datetime import datetime, timedelta

# Paleta de colores automotriz
ct.set_default_color_theme("blue")

# Definimos la clase principal de la aplicación
class AutomotrizApp:
    def __init__(self, root):
        self.root = root
        self.root.geometry("1200x800+250+200")
        self.root.title("Automotriz Pro")

        # Configuración inicial de la apariencia
        ct.set_appearance_mode("light")

        # Conectar a la base de datos SQLite
        self.conn = sqlite3.connect('automotriz.db')
        self.c = self.conn.cursor()
        self.create_tables()

        # Nombre de la empresa
        self.title_label = CTkLabel(self.root, text="Automotriz Pro", font=("Arial", 24))
        self.title_label.pack(pady=20)

        # Frame para el inicio de sesión
        self.login_frame = CTkFrame(self.root)
        self.login_frame.pack(pady=20)

        self.username_label = CTkLabel(self.login_frame, text="Usuario:")
        self.username_label.grid(row=0, column=0, padx=10, pady=10)

        self.username_entry = CTkEntry(self.login_frame)
        self.username_entry.grid(row=0, column=1, padx=10, pady=10)

        self.password_label = CTkLabel(self.login_frame, text="Contraseña:")
        self.password_label.grid(row=1, column=0, padx=10, pady=10)

        self.password_entry = CTkEntry(self.login_frame, show="*")
        self.password_entry.grid(row=1, column=1, padx=10, pady=10)

        self.login_button = CTkButton(self.login_frame, text="Iniciar Sesión", command=self.login)
        self.login_button.grid(row=2, column=0, columnspan=2, pady=10)

        # Configurar el evento de presionar Enter en los campos de inicio de sesión
        self.username_entry.bind("<Return>", lambda event: self.login())
        self.password_entry.bind("<Return>", lambda event: self.login())

        # Frame principal (se mostrará después del login)
        self.main_frame = CTkFrame(self.root)

        # Frame para el análisis predictivo y la base de datos de clientes
        self.left_frame = CTkFrame(self.main_frame)
        self.left_frame.pack(side="left", fill="both", expand=True, padx=20, pady=20)

        # Frame para la imagen térmica
        self.right_frame = CTkFrame(self.main_frame)
        self.right_frame.pack(side="right", fill="both", expand=True, padx=20, pady=20)

        # Switch para cambiar entre modos claro y oscuro
        self.switch = CTkSwitch(self.left_frame, text="Dark Mode",
                                onvalue=1, offvalue=0,
                                command=self.change_mode)
        self.switch.pack(pady=20)

        # Frame para el análisis predictivo
        self.analysis_frame = CTkFrame(self.left_frame)
        self.analysis_frame.pack(pady=20)

        self.age_label = CTkLabel(self.analysis_frame, text="Antigüedad del vehículo:")
        self.age_label.grid(row=0, column=0, padx=10, pady=10)

        self.age_options = ["Nuevo", "Seminuevo", "Viejo"]
        self.age_combobox = CTkComboBox(self.analysis_frame, values=self.age_options)
        self.age_combobox.grid(row=0, column=1, padx=10, pady=10)

        self.oil_label = CTkLabel(self.analysis_frame, text="Estado del aceite:")
        self.oil_label.grid(row=1, column=0, padx=10, pady=10)

        self.oil_options = ["Bueno", "Regular", "Malo"]
        self.oil_combobox = CTkComboBox(self.analysis_frame, values=self.oil_options)
        self.oil_combobox.grid(row=1, column=1, padx=10, pady=10)

        self.vibration_label = CTkLabel(self.analysis_frame, text="Nivel de vibraciones:")
        self.vibration_label.grid(row=2, column=0, padx=10, pady=10)

        self.vibration_options = ["Bajo", "Moderado", "Alto"]
        self.vibration_combobox = CTkComboBox(self.analysis_frame, values=self.vibration_options)
        self.vibration_combobox.grid(row=2, column=1, padx=10, pady=10)

        self.analyze_button = CTkButton(self.analysis_frame, text="Analizar", command=self.analyze_vehicle)
        self.analyze_button.grid(row=3, column=0, columnspan=2, pady=10)

        # Frame para la base de datos de clientes
        self.client_frame = CTkFrame(self.left_frame)
        self.client_frame.pack(pady=20)

        self.name_label = CTkLabel(self.client_frame, text="Nombre:")
        self.name_label.grid(row=0, column=0, padx=10, pady=10)

        self.name_entry = CTkEntry(self.client_frame)
        self.name_entry.grid(row=0, column=1, padx=10, pady=10)

        self.email_label = CTkLabel(self.client_frame, text="Correo:")
        self.email_label.grid(row=1, column=0, padx=10, pady=10)

        self.email_entry = CTkEntry(self.client_frame)
        self.email_entry.grid(row=1, column=1, padx=10, pady=10)

        self.car_model_label = CTkLabel(self.client_frame, text="Modelo del carro:")
        self.car_model_label.grid(row=2, column=0, padx=10, pady=10)

        self.car_model_entry = CTkEntry(self.client_frame)
        self.car_model_entry.grid(row=2, column=1, padx=10, pady=10)

        self.revision_label = CTkLabel(self.client_frame, text="Revisión realizada:")
        self.revision_label.grid(row=3, column=0, padx=10, pady=10)

        self.revision_options = ["Aceite", "Frenos", "Motor", "Suspensión", "Transmisión"]
        self.revision_combobox = CTkComboBox(self.client_frame, values=self.revision_options)
        self.revision_combobox.grid(row=3, column=1, padx=10, pady=10)

        self.add_client_button = CTkButton(self.client_frame, text="Agregar Cliente", command=self.add_client)
        self.add_client_button.grid(row=4, column=0, columnspan=2, pady=10)

        self.view_clients_button = CTkButton(self.client_frame, text="Ver Clientes", command=self.view_clients)
        self.view_clients_button.grid(row=5, column=0, columnspan=2, pady=10)

        # Treeview para mostrar clientes
        self.client_tree = ttk.Treeview(self.client_frame, columns=("ID", "Nombre", "Correo", "Modelo", "Revisión", "Próxima Visita"), show="headings")
        self.client_tree.heading("ID", text="ID")
        self.client_tree.heading("Nombre", text="Nombre")
        self.client_tree.heading("Correo", text="Correo")
        self.client_tree.heading("Modelo", text="Modelo")
        self.client_tree.heading("Revisión", text="Revisión")
        self.client_tree.heading("Próxima Visita", text="Próxima Visita")
        self.client_tree.grid(row=6, column=0, columnspan=2, pady=10)

        # Frame para la imagen térmica
        self.thermal_frame = CTkFrame(self.right_frame)
        self.thermal_frame.pack(pady=20)

        self.upload_button = CTkButton(self.thermal_frame, text="Subir Imagen Térmica", command=self.upload_image)
        self.upload_button.pack(pady=20)

        self.image_label = CTkLabel(self.thermal_frame, text="Imagen Térmica aparecerá aquí")
        self.image_label.pack(pady=20)

        # Frame para administración de mecánicos (solo visible para admin)
        self.admin_frame = CTkFrame(self.left_frame)

        self.mechanics_label = CTkLabel(self.admin_frame, text="Mecánicos Registrados", font=("Arial", 16))
        self.mechanics_label.pack(pady=10)

        self.mechanics_tree = ttk.Treeview(self.admin_frame, columns=("ID", "Usuario"), show="headings")
        self.mechanics_tree.heading("ID", text="ID")
        self.mechanics_tree.heading("Usuario", text="Usuario")
        self.mechanics_tree.pack(pady=10)

        self.add_mechanic_button = CTkButton(self.admin_frame, text="Agregar Mecánico", command=self.add_mechanic)
        self.add_mechanic_button.pack(pady=10)

        self.remove_mechanic_button = CTkButton(self.admin_frame, text="Quitar Mecánico", command=self.remove_mechanic)
        self.remove_mechanic_button.pack(pady=10)

    # Función para cambiar entre modos claro y oscuro
    def change_mode(self):
        val = self.switch.get()
        if val:
            ct.set_appearance_mode("dark")
        else:
            ct.set_appearance_mode("light")

    # Función para subir imágenes térmicas
    def upload_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg")])
        if file_path:
            self.image_label.configure(text=f"Imagen subida: {file_path}")

    # Función para analizar el vehículo
    def analyze_vehicle(self):
        age = self.age_combobox.get()
        oil = self.oil_combobox.get()
        vibration = self.vibration_combobox.get()

        if age == "Nuevo":
            if oil == "Bueno" and vibration == "Bajo":
                messagebox.showinfo("Análisis", "El vehículo está en excelentes condiciones. Próxima visita en 6 meses.")
            else:
                messagebox.showinfo("Análisis", "El vehículo es nuevo pero necesita atención. Próxima visita en 3 meses.")
        elif age == "Seminuevo":
            if oil == "Bueno" and vibration == "Bajo":
                messagebox.showinfo("Análisis", "El vehículo está en buenas condiciones. Próxima visita en 4 meses.")
            else:
                messagebox.showinfo("Análisis", "El vehículo necesita mantenimiento. Próxima visita en 2 meses.")
        elif age == "Viejo":
            messagebox.showinfo("Análisis", "El vehículo es viejo y necesita revisión completa. Próxima visita en 1 mes.")

    # Función para crear las tablas en la base de datos
    def create_tables(self):
        self.c.execute('''CREATE TABLE IF NOT EXISTS clientes (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nombre TEXT,
                            correo TEXT,
                            modelo_carro TEXT,
                            revision TEXT,
                            proxima_visita TEXT)''')
        self.c.execute('''CREATE TABLE IF NOT EXISTS mecanicos (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            usuario TEXT,
                            contraseña TEXT)''')
        self.conn.commit()

    # Función para agregar un cliente a la base de datos
    def add_client(self):
        nombre = self.name_entry.get()
        correo = self.email_entry.get()
        modelo_carro = self.car_model_entry.get()
        revision = self.revision_combobox.get()

        if nombre and correo and modelo_carro and revision:
            proxima_visita = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            self.c.execute("INSERT INTO clientes (nombre, correo, modelo_carro, revision, proxima_visita) VALUES (?, ?, ?, ?, ?)",
                           (nombre, correo, modelo_carro, revision, proxima_visita))
            self.conn.commit()
            messagebox.showinfo("Éxito", "Cliente agregado correctamente.")
            self.update_client_tree()
        else:
            messagebox.showerror("Error", "Todos los campos son obligatorios.")

    # Función para actualizar el Treeview de clientes
    def update_client_tree(self):
        self.client_tree.delete(*self.client_tree.get_children())
        self.c.execute("SELECT * FROM clientes")
        rows = self.c.fetchall()
        for row in rows:
            self.client_tree.insert("", "end", values=row)

    # Función para visualizar la base de datos de clientes
    def view_clients(self):
        self.update_client_tree()

    # Función para iniciar sesión
    def login(self):
        usuario = self.username_entry.get()
        contraseña = self.password_entry.get()

        if not usuario and not contraseña:
            messagebox.showerror("Error", "Falta ingresar usuario y contraseña.")
            self.username_entry.focus()
        elif not usuario:
            messagebox.showerror("Error", "Falta ingresar usuario.")
            self.username_entry.focus()
        elif not contraseña:
            messagebox.showerror("Error", "Falta ingresar contraseña.")
            self.password_entry.focus()
        else:
            if usuario == "admin" and contraseña == "1303":
                self.login_frame.pack_forget()
                self.main_frame.pack()
                self.admin_frame.pack(pady=20)
                self.update_mechanics_list()
            else:
                self.c.execute("SELECT * FROM mecanicos WHERE usuario=? AND contraseña=?", (usuario, contraseña))
                if self.c.fetchone():
                    self.login_frame.pack_forget()
                    self.main_frame.pack()
                else:
                    messagebox.showerror("Error", "Usuario o contraseña incorrectos.")

    # Función para actualizar la lista de mecánicos
    def update_mechanics_list(self):
        self.mechanics_tree.delete(*self.mechanics_tree.get_children())
        self.c.execute("SELECT * FROM mecanicos")
        rows = self.c.fetchall()
        for row in rows:
            self.mechanics_tree.insert("", "end", values=(row[0], row[1]))

    # Función para agregar un mecánico
    def add_mechanic(self):
        usuario = simpledialog.askstring("Agregar Mecánico", "Ingrese el nombre de usuario:")
        contraseña = simpledialog.askstring("Agregar Mecánico", "Ingrese la contraseña:")
        if usuario and contraseña:
            self.c.execute("INSERT INTO mecanicos (usuario, contraseña) VALUES (?, ?)", (usuario, contraseña))
            self.conn.commit()
            self.update_mechanics_list()

    # Función para quitar un mecánico
    def remove_mechanic(self):
        id_mechanic = simpledialog.askinteger("Quitar Mecánico", "Ingrese el ID del mecánico a quitar:")
        if id_mechanic:
            self.c.execute("DELETE FROM mecanicos WHERE id=?", (id_mechanic,))
            self.conn.commit()
            self.update_mechanics_list()

# Inicializar la aplicación
if __name__ == "__main__":
    root = CTk()
    app = AutomotrizApp(root)
    root.mainloop()
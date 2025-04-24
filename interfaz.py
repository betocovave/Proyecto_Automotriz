import customtkinter as ct #se importa la librería de la GUI
from customtkinter import *

#definimos el modo de apariencia como modo claro
ct.set_appearance_mode("light")
ct.set_default_color_theme("dark-blue")

#se definen las dimensiones de la GUI
main_window=CTk()
main_window.geometry("600x400+250+200")
main_window.title("Automotriz")

#se crea la función que cambia de modo claro a modo oscuro
def changeMode():
    val=switch.get()
    if val:
        ct.set_appearance_mode("dark")
    else:
        ct.set_appearance_mode("light")


switch = CTkSwitch(main_window,text="Dark Mode",
                   onvalue = 1,
                   offvalue = 0,
                   command=changeMode)
switch.pack(pady=20)
print(switch.get())

main_window.mainloop()



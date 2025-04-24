import os
import sys
import subprocess
import time

def instalar_dependencias():
    """
    Script para instalar automáticamente todas las dependencias necesarias para
    los análisis de datos de talleres automotrices.
    """
    print("=" * 60)
    print("INSTALADOR DE DEPENDENCIAS - ANÁLISIS DE TALLERES AUTOMOTRICES")
    print("=" * 60)
    
    # Obtener la ruta del directorio actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    requirements_path = os.path.join(current_dir, 'requirements.txt')
    
    # Verificar que existe el archivo requirements.txt
    if not os.path.exists(requirements_path):
        print("Error: No se encontró el archivo requirements.txt")
        print(f"Ruta buscada: {requirements_path}")
        return False
    
    print(f"Encontrado archivo de requisitos en: {requirements_path}")
    print("\nDependencias a instalar:")
    
    # Mostrar las dependencias que se van a instalar
    with open(requirements_path, 'r') as f:
        requirements = f.readlines()
        for req in requirements:
            req = req.strip()
            if req and not req.startswith('#'):
                print(f"- {req}")
    
    # Confirmar la instalación
    print("\n" + "=" * 60)
    print("La instalación comenzará en 3 segundos... (Ctrl+C para cancelar)")
    print("=" * 60)
    
    for i in range(3, 0, -1):
        print(f"{i}...", end=" ", flush=True)
        time.sleep(1)
    print("¡Comenzando instalación!")
    
    # Instalar dependencias
    try:
        print("\nInstalando dependencias...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', requirements_path])
        print("\n" + "=" * 60)
        print("✅ ¡Instalación completada con éxito!")
        print("=" * 60)
        
        # Información sobre el siguiente paso
        print("\nTodos los paquetes necesarios han sido instalados.")
        print("\nPara ejecutar los análisis, puede usar cualquiera de estos comandos:")
        print("1. Análisis básico:")
        print("   python regresion_talleres.py")
        print("2. Análisis avanzado:")
        print("   python regresion_talleres_avanzado.py")
        print("3. Visualizaciones interactivas:")
        print("   python visualizar_datos_completos.py")
        print("\nLos resultados se guardarán en las carpetas 'graficos' y 'graficos_interactivos'.")
        
        return True
    
    except subprocess.CalledProcessError as e:
        print("\nError durante la instalación de dependencias:")
        print(str(e))
        return False
    
if __name__ == "__main__":
    instalar_dependencias() 
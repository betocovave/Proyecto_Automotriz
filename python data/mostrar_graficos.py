import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import os

def mostrar_graficos():
    # Obtener la ruta actual
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Verificar si los archivos existen
    archivos = [
        os.path.join(current_dir, 'regresion_talleres_resultados.png'),
        os.path.join(current_dir, 'importancia_variables.png')
    ]
    
    archivos_existentes = [archivo for archivo in archivos if os.path.exists(archivo)]
    
    if not archivos_existentes:
        print("No se encontraron archivos de gráficos. Ejecute primero regresion_talleres.py")
        return
    
    # Mostrar cada gráfico en una figura separada
    for archivo in archivos_existentes:
        print(f"Mostrando gráfico: {os.path.basename(archivo)}")
        img = mpimg.imread(archivo)
        plt.figure(figsize=(10, 6))
        plt.imshow(img)
        plt.axis('off')
        plt.title(f"Gráfico: {os.path.basename(archivo)}")
        plt.show()
        # Esperar input del usuario antes de continuar al siguiente gráfico
        if archivo != archivos_existentes[-1]:
            input("Presione Enter para ver el siguiente gráfico...")

if __name__ == "__main__":
    print("Mostrando gráficos generados por el análisis de regresión lineal...")
    mostrar_graficos() 
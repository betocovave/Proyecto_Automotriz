import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import numpy as np
import io
import os # Import the os library to handle directories

# --- Start of simulated file data (using the same data as before) ---
csv_data = """Citas_Diarias,Mecanicos_Disponibles,Tiempo_Promedio_Reparacion,Satisfaccion_Cliente,Tipo_Taller,Reparaciones_Realizadas,KPI_Eficiencia,Ingresos_Promedio,Antigüedad_Promedio_Vehiculos,Capacitacion_Tecnicos,Piezas_Disponibles_Ratio
48,6,40.39,9.27,Premium VW,31,0.82,4850,3.5,95,0.92
38,3,55.57,9.44,Concesionario,26,0.71,3200,5.2,80,0.85
24,5,48.44,6.03,Concesionario,8,0.63,2100,7.1,65,0.74
52,5,27.37,8.04,Premium VW,39,0.86,5300,2.8,98,0.95
17,8,48.24,7.67,Independiente,15,0.59,1800,8.3,50,0.68
30,5,41.15,6.89,Concesionario,13,0.68,2700,6.2,75,0.82
48,8,38.23,6.48,Concesionario,40,0.78,4200,4.5,85,0.88
28,5,51.12,7.35,Concesionario,21,0.65,2400,6.7,70,0.76
32,6,55.31,9.77,Premium VW,10,0.75,3800,4.1,90,0.89
20,9,54.31,7.29,Concesionario,14,0.62,2000,7.5,65,0.71
20,8,36.61,8.08,Premium VW,18,0.77,4100,3.9,92,0.91
33,4,41.91,8.81,Premium VW,24,0.81,4600,3.2,94,0.93
45,7,48.31,7.45,Premium VW,26,0.79,4400,3.6,93,0.90
49,2,54.76,9.89,Concesionario,19,0.67,3100,5.8,75,0.83
33,5,40.21,9.85,Premium VW,24,0.84,4900,2.9,96,0.94
12,3,43.14,7.01,Independiente,3,0.55,1500,9.2,45,0.65
31,9,33.94,7.99,Concesionario,29,0.72,3300,5.0,80,0.84
11,5,33.04,7.20,Concesionario,8,0.61,2000,7.8,60,0.72
33,3,53.13,7.14,Concesionario,12,0.64,2500,6.5,70,0.75
53,7,58.56,6.15,Concesionario,36,0.76,3800,4.2,85,0.87
39,7,44.28,8.44,Concesionario,30,0.73,3400,4.9,80,0.85
47,7,55.04,8.01,Premium VW,28,0.80,4500,3.3,93,0.92
11,3,48.62,6.21,Premium VW,8,0.69,3900,4.0,91,0.88
30,5,38.55,7.11,Concesionario,22,0.70,3100,5.4,75,0.83
42,7,48.61,9.63,Premium VW,24,0.83,4700,3.1,95,0.93
21,6,60.38,6.96,Concesionario,11,0.60,2200,7.3,65,0.73
31,8,44.64,6.58,Premium VW,19,0.76,4200,3.8,92,0.90
53,3,60.65,7.96,Premium VW,33,0.79,4600,3.4,94,0.91
34,3,20.00,9.94,Premium VW,31,0.88,5200,2.5,97,0.96
58,5,53.22,6.97,Premium VW,34,0.85,5000,2.7,96,0.95
36,3,45.87,8.69,Independiente,24,0.63,2200,7.0,55,0.69
51,3,42.01,9.05,Concesionario,35,0.74,3500,4.7,82,0.86
37,7,45.92,6.95,Independiente,30,0.64,2300,6.8,58,0.71
25,5,25.12,8.91,Premium VW,29,0.87,5100,2.6,97,0.95
24,7,42.80,7.47,Independiente,16,0.61,1900,8.1,53,0.70
56,8,48.57,8.53,Concesionario,38,0.75,3700,4.3,83,0.87
53,9,59.78,8.53,Concesionario,34,0.77,3900,4.1,84,0.88
12,8,39.82,8.14,Premium VW,6,0.82,4800,3.0,95,0.92
46,9,36.92,6.36,Independiente,39,0.66,2400,6.5,60,0.72
16,7,39.98,9.34,Independiente,13,0.58,1700,8.4,48,0.67
30,8,54.15,7.28,Independiente,21,0.60,1900,8.0,52,0.68
18,5,48.29,6.75,Concesionario,12,0.63,2300,6.9,68,0.74
48,2,39.70,6.16,Concesionario,30,0.71,3200,5.1,79,0.84
27,7,50.13,8.36,Independiente,24,0.62,2100,7.6,54,0.69
13,9,45.97,8.71,Concesionario,9,0.65,2600,6.4,72,0.77
34,6,54.69,6.07,Concesionario,33,0.69,3000,5.5,76,0.82
23,9,37.98,8.05,Independiente,24,0.61,2000,7.9,51,0.69
59,6,41.72,6.91,Concesionario,39,0.73,3500,4.8,81,0.85
18,3,41.08,8.58,Independiente,1,0.57,1600,8.7,47,0.66
35,8,30.36,6.70,Independiente,33,0.65,2400,6.6,56,0.71
62,10,35.25,9.45,Premium VW,45,0.89,5500,2.2,99,0.97
57,9,32.18,9.30,Premium VW,43,0.88,5300,2.3,98,0.96
54,8,33.72,9.10,Premium VW,42,0.87,5100,2.4,97,0.95
61,9,31.95,9.40,Premium VW,46,0.90,5600,2.1,99,0.98
60,8,34.28,9.25,Premium VW,44,0.88,5400,2.3,98,0.97
17,4,58.63,6.12,Independiente,14,0.59,1700,8.5,49,0.68
15,3,59.85,5.95,Independiente,10,0.54,1400,9.3,44,0.64
18,5,57.42,6.35,Independiente,15,0.60,1800,8.2,51,0.69
14,3,60.32,5.85,Independiente,9,0.53,1300,9.5,42,0.63
16,4,59.15,6.05,Independiente,12,0.56,1500,8.9,46,0.66
42,4,38.75,8.85,Concesionario VW,32,0.82,4600,3.2,93,0.92
45,5,37.62,8.95,Concesionario VW,35,0.83,4700,3.1,94,0.93
40,4,39.58,8.75,Concesionario VW,30,0.81,4500,3.3,92,0.91
44,5,36.95,9.05,Concesionario VW,34,0.84,4800,3.0,95,0.94
41,4,38.12,8.80,Concesionario VW,31,0.82,4600,3.2,93,0.92
"""
# --- End of simulated file data ---

# Load the dataframe
df = pd.read_csv(io.StringIO(csv_data))

# --- Regression specific to 'KPI_Eficiencia' and 'Reparaciones_Realizadas' ---

# 1. Define the specific variables of interest
x_var = 'KPI_Eficiencia'
y_var = 'Reparaciones_Realizadas'

# 2. Prepare data for linear regression
X = df[[x_var]].values
y = df[y_var].values

# 3. Fit the Linear Regression model
model = LinearRegression()
model.fit(X, y)
r_squared = model.score(X, y)

print(f"Regresión Lineal entre '{x_var}' y '{y_var}':")
print(f"Modelo: {y_var} = {model.coef_[0]:.4f} * {x_var} + {model.intercept_:.4f}")
print(f"Coeficiente de determinación (R²): {r_squared:.4f}")
print(f"Correlación (calculada): {df[x_var].corr(df[y_var]):.4f}")

# --- Plotting and Saving ---

# 4. Define the output folder and filename
output_folder = "graficos"
filename = "contexto_ideal_regresion_eficiencia_reparaciones.png" # You can change the extension (jpg, pdf, etc.)
filepath = os.path.join(output_folder, filename)

# 5. Create the output folder if it doesn't exist
if not os.path.exists(output_folder):
    os.makedirs(output_folder)
    print(f"Carpeta creada: {output_folder}")

# 6. Generate the plot
plt.style.use('seaborn-v0_8-darkgrid')
plt.figure(figsize=(12, 7))

sns.regplot(x=x_var, y=y_var, data=df,
            scatter_kws={'s': 80, 'alpha': 0.7},
            line_kws={'color': 'red', 'linewidth': 2})

plt.title(f'Regresión Lineal: Relación entre {x_var} y {y_var}\n(R² = {r_squared:.3f})', fontsize=14)
plt.xlabel(x_var, fontsize=12)
plt.ylabel(y_var, fontsize=12)
plt.grid(True)
plt.tight_layout()

# 7. Save the plot to the specified file *before* showing it
try:
    plt.savefig(filepath, dpi=300) # dpi sets the resolution
    print(f"Gráfico guardado exitosamente en: {filepath}")
except Exception as e:
    print(f"Error al guardar el gráfico: {e}")


# 8. Display the plot (optional, can be commented out if you only want to save)
plt.show()
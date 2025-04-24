import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import os

# Cargar el dataset
current_dir = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(current_dir, 'dataset_talleres.csv'))

# Mostrar información básica del dataset
print("Información del dataset:")
print(df.info())
print("\nEstadísticas descriptivas:")
print(df.describe())

# Convertir la columna categórica 'Tipo_Taller' a variables dummy
df_encoded = pd.get_dummies(df, columns=['Tipo_Taller'], drop_first=True)

# Definir las variables predictoras (X) y la variable objetivo (y)
# Asumimos que queremos predecir 'Reparaciones_Realizadas' basado en otras variables
X = df_encoded.drop('Reparaciones_Realizadas', axis=1)
y = df_encoded['Reparaciones_Realizadas']

# Dividir los datos en conjuntos de entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Crear y entrenar el modelo de regresión lineal
modelo = LinearRegression()
modelo.fit(X_train, y_train)

# Realizar predicciones
y_pred = modelo.predict(X_test)

# Evaluar el modelo
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\nResultados del modelo de regresión lineal:")
print(f"Error cuadrático medio (MSE): {mse:.2f}")
print(f"Coeficiente de determinación (R²): {r2:.2f}")

# Mostrar los coeficientes
coeficientes = pd.DataFrame(modelo.coef_, X.columns, columns=['Coeficiente'])
print("\nCoeficientes del modelo:")
print(coeficientes)

# Visualizar resultados
plt.figure(figsize=(10, 6))
plt.scatter(y_test, y_pred)
plt.plot([y.min(), y.max()], [y.min(), y.max()], 'r--')
plt.xlabel('Valores reales')
plt.ylabel('Predicciones')
plt.title('Valores reales vs. Predicciones')
plt.savefig(os.path.join(current_dir, 'regresion_talleres_resultados.png'))
plt.show()

# Analizar importancia de variables
plt.figure(figsize=(12, 6))
coeficientes.sort_values('Coeficiente', ascending=False).plot(kind='bar')
plt.title('Importancia de las variables')
plt.tight_layout()
plt.savefig(os.path.join(current_dir, 'importancia_variables.png'))
plt.show()

print("\nAnalisis completado. Gráficos guardados en la carpeta 'python data'") 
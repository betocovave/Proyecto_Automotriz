import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.pipeline import Pipeline

# Establecer el estilo de las gráficas
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("viridis")

# Directorio actual
current_dir = os.path.dirname(os.path.abspath(__file__))

# Cargar el dataset mejorado
file_path = os.path.join(current_dir, 'dataset_talleres_mejorado.csv')
df = pd.read_csv(file_path)

# Información básica del dataset
print("=" * 60)
print("ANÁLISIS DE PRODUCTIVIDAD EN TALLERES AUTOMOTRICES")
print("=" * 60)
print("\nInformación del dataset:")
print(df.info())
print("\nEstadísticas descriptivas:")
print(df.describe().round(2))

# Verificar valores nulos
print("\nValores nulos por columna:")
print(df.isnull().sum())

# Analizar la distribución de tipos de taller
print("\nDistribución por tipo de taller:")
tipo_taller_counts = df['Tipo_Taller'].value_counts()
print(tipo_taller_counts)

# Análisis exploratorio de datos (EDA)
print("\n" + "=" * 60)
print("ANÁLISIS EXPLORATORIO DE DATOS")
print("=" * 60)

# Crear carpeta para gráficos si no existe
graphs_dir = os.path.join(current_dir, 'graficos')
if not os.path.exists(graphs_dir):
    os.makedirs(graphs_dir)

# Gráfico 1: Distribución de Reparaciones Realizadas por Tipo de Taller
plt.figure(figsize=(12, 6))
sns.boxplot(x='Tipo_Taller', y='Reparaciones_Realizadas', data=df)
plt.title('Distribución de Reparaciones Realizadas por Tipo de Taller', fontsize=14)
plt.xlabel('Tipo de Taller', fontsize=12)
plt.ylabel('Reparaciones Realizadas', fontsize=12)
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'reparaciones_por_tipo_taller.png'))
plt.close()

# Gráfico 2: Relación entre Eficiencia y Reparaciones
plt.figure(figsize=(10, 6))
sns.scatterplot(x='KPI_Eficiencia', y='Reparaciones_Realizadas', hue='Tipo_Taller', data=df, s=100, alpha=0.7)
plt.title('Relación entre Eficiencia y Reparaciones Realizadas', fontsize=14)
plt.xlabel('KPI de Eficiencia', fontsize=12)
plt.ylabel('Reparaciones Realizadas', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend(title='Tipo de Taller')
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'eficiencia_vs_reparaciones.png'))
plt.close()

# Gráfico 3: Matriz de correlación
plt.figure(figsize=(14, 10))
numeric_df = df.select_dtypes(include=[np.number])
correlation_matrix = numeric_df.corr()
mask = np.triu(np.ones_like(correlation_matrix, dtype=bool))
sns.heatmap(correlation_matrix, mask=mask, annot=True, fmt=".2f", cmap='coolwarm', 
            linewidths=0.5, cbar_kws={"shrink": .8})
plt.title('Matriz de Correlación de Variables Numéricas', fontsize=16)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'matriz_correlacion.png'))
plt.close()

# Gráfico 4: Relación entre variables importantes
fig, axes = plt.subplots(2, 2, figsize=(16, 12))

sns.scatterplot(ax=axes[0, 0], x='Mecanicos_Disponibles', y='Reparaciones_Realizadas', 
                hue='Tipo_Taller', data=df, s=80, alpha=0.7)
axes[0, 0].set_title('Mecánicos vs Reparaciones', fontsize=14)
axes[0, 0].grid(True, alpha=0.3)

sns.scatterplot(ax=axes[0, 1], x='Tiempo_Promedio_Reparacion', y='Reparaciones_Realizadas', 
                hue='Tipo_Taller', data=df, s=80, alpha=0.7)
axes[0, 1].set_title('Tiempo de Reparación vs Reparaciones', fontsize=14)
axes[0, 1].grid(True, alpha=0.3)

sns.scatterplot(ax=axes[1, 0], x='Capacitacion_Tecnicos', y='Reparaciones_Realizadas', 
                hue='Tipo_Taller', data=df, s=80, alpha=0.7)
axes[1, 0].set_title('Capacitación de Técnicos vs Reparaciones', fontsize=14)
axes[1, 0].grid(True, alpha=0.3)

sns.scatterplot(ax=axes[1, 1], x='Piezas_Disponibles_Ratio', y='Reparaciones_Realizadas', 
                hue='Tipo_Taller', data=df, s=80, alpha=0.7)
axes[1, 1].set_title('Disponibilidad de Piezas vs Reparaciones', fontsize=14)
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'relaciones_principales.png'))
plt.close()

# Preparación de datos para modelado
print("\n" + "=" * 60)
print("MODELADO Y PREDICCIÓN")
print("=" * 60)

# Convertir la columna categórica 'Tipo_Taller' a variables dummy
df_encoded = pd.get_dummies(df, columns=['Tipo_Taller'], drop_first=True)

# Definir las variables predictoras (X) y la variable objetivo (y)
X = df_encoded.drop('Reparaciones_Realizadas', axis=1)
y = df_encoded['Reparaciones_Realizadas']

# Dividir los datos en conjuntos de entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# Escalado de características
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Selección de características
selector = SelectKBest(f_regression, k=8)  # Seleccionar las 8 mejores características
X_train_selected = selector.fit_transform(X_train_scaled, y_train)
X_test_selected = selector.transform(X_test_scaled)

# Obtener los nombres de las características seleccionadas
selected_features_indices = selector.get_support(indices=True)
selected_features = X.columns[selected_features_indices]
print("\nCaracterísticas seleccionadas:")
for i, feature in enumerate(selected_features):
    print(f"{i+1}. {feature}")

# Modelado y evaluación
models = {
    "Regresión Lineal": LinearRegression(),
    "Ridge": Ridge(alpha=1.0),
    "Lasso": Lasso(alpha=0.1),
    "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42)
}

results = {}

for name, model in models.items():
    print(f"\n{'-'*30}")
    print(f"Modelo: {name}")
    
    # Entrenamiento y predicción
    model.fit(X_train_selected, y_train)
    y_pred = model.predict(X_test_selected)
    
    # Métricas de evaluación
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Error Cuadrático Medio (MSE): {mse:.2f}")
    print(f"Raíz del Error Cuadrático Medio (RMSE): {rmse:.2f}")
    print(f"Error Absoluto Medio (MAE): {mae:.2f}")
    print(f"Coeficiente de Determinación (R²): {r2:.2f}")
    
    # Validación cruzada
    cv_scores = cross_val_score(model, X_train_selected, y_train, cv=5, scoring='r2')
    print(f"R² promedio en validación cruzada: {cv_scores.mean():.2f} (±{cv_scores.std():.2f})")
    
    results[name] = {
        'model': model,
        'mse': mse,
        'rmse': rmse,
        'mae': mae,
        'r2': r2,
        'cv_r2_mean': cv_scores.mean(),
        'cv_r2_std': cv_scores.std(),
        'y_pred': y_pred
    }

# Seleccionar el mejor modelo basado en R²
best_model_name = max(results, key=lambda x: results[x]['r2'])
best_model = results[best_model_name]

print("\n" + "=" * 60)
print(f"MEJOR MODELO: {best_model_name}")
print("=" * 60)
print(f"R²: {best_model['r2']:.2f}")
print(f"RMSE: {best_model['rmse']:.2f}")

# Visualizar resultados del mejor modelo
plt.figure(figsize=(10, 6))
plt.scatter(y_test, best_model['y_pred'], color='blue', alpha=0.7)
plt.plot([y.min(), y.max()], [y.min(), y.max()], 'r--')
plt.xlabel('Valores Reales', fontsize=12)
plt.ylabel('Predicciones', fontsize=12)
plt.title(f'Valores Reales vs. Predicciones - {best_model_name}', fontsize=14)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'mejor_modelo_predicciones.png'))
plt.close()

# Si el mejor modelo es Random Forest, visualizar importancia de características
if best_model_name == "Random Forest":
    model = results[best_model_name]['model']
    
    # Obtener importancia de características
    feature_importances = model.feature_importances_
    sorted_idx = np.argsort(feature_importances)
    
    plt.figure(figsize=(12, 8))
    plt.barh(range(len(sorted_idx)), feature_importances[sorted_idx], align='center')
    plt.yticks(range(len(sorted_idx)), [selected_features[i] for i in sorted_idx])
    plt.title('Importancia de Características - Random Forest', fontsize=14)
    plt.xlabel('Importancia', fontsize=12)
    plt.tight_layout()
    plt.savefig(os.path.join(graphs_dir, 'importancia_caracteristicas_rf.png'))
    plt.close()

# Comparar modelos
plt.figure(figsize=(12, 6))
model_names = list(results.keys())
r2_scores = [results[model]['r2'] for model in model_names]
rmse_scores = [results[model]['rmse'] for model in model_names]

x = np.arange(len(model_names))
width = 0.35

fig, ax = plt.subplots(figsize=(14, 8))
rects1 = ax.bar(x - width/2, r2_scores, width, label='R²', color='seagreen')
ax.set_ylabel('R²', fontsize=12)
ax.set_title('Comparación de Modelos', fontsize=16)
ax.set_xticks(x)
ax.set_xticklabels(model_names, rotation=45)
ax.legend(loc='upper left')

ax2 = ax.twinx()
rects2 = ax2.bar(x + width/2, rmse_scores, width, label='RMSE', color='tomato')
ax2.set_ylabel('RMSE', fontsize=12)
ax2.legend(loc='upper right')

fig.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'comparacion_modelos.png'))
plt.close()

# Análisis específico para talleres Volkswagen
print("\n" + "=" * 60)
print("ANÁLISIS ESPECÍFICO PARA TALLERES VOLKSWAGEN")
print("=" * 60)

# Filtrar datos para talleres relacionados con Volkswagen
vw_talleres = df[df['Tipo_Taller'].str.contains('VW') | df['Tipo_Taller'].str.contains('Concesionario VW')]

print(f"\nNúmero de talleres Volkswagen analizados: {len(vw_talleres)}")
print("\nEstadísticas para talleres Volkswagen:")
print(vw_talleres.describe().round(2))

# Comparar rendimiento entre tipos de talleres VW
plt.figure(figsize=(12, 6))
talleres_vw_tipo = df[df['Tipo_Taller'].str.contains('VW') | df['Tipo_Taller'].str.contains('Concesionario')]
sns.boxplot(x='Tipo_Taller', y='KPI_Eficiencia', data=talleres_vw_tipo)
plt.title('Comparación de Eficiencia por Tipo de Taller Volkswagen', fontsize=14)
plt.xlabel('Tipo de Taller', fontsize=12)
plt.ylabel('KPI de Eficiencia', fontsiz=12)
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'eficiencia_talleres_vw.png'))
plt.close()

# Gráfico comparativo de Volkswagen vs Independientes
tipos_comparar = ['Premium VW', 'Concesionario VW', 'Independiente']
df_comparacion = df[df['Tipo_Taller'].isin(tipos_comparar)]

plt.figure(figsize=(14, 7))
sns.scatterplot(x='Capacitacion_Tecnicos', y='Reparaciones_Realizadas', 
                hue='Tipo_Taller', size='Piezas_Disponibles_Ratio', sizes=(50, 250),
                data=df_comparacion, alpha=0.7)
plt.title('Capacitación vs Reparaciones por Tipo de Taller', fontsize=16)
plt.xlabel('Nivel de Capacitación de Técnicos', fontsize=12)
plt.ylabel('Reparaciones Realizadas', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend(title='Tipo de Taller', fontsize=10)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'comparacion_vw_vs_independientes.png'))
plt.close()

# Relación entre antigüedad de vehículos y eficiencia de reparación
plt.figure(figsize=(12, 6))
sns.scatterplot(x='Antigüedad_Promedio_Vehiculos', y='Tiempo_Promedio_Reparacion', 
                hue='Tipo_Taller', size='Reparaciones_Realizadas', sizes=(50, 250),
                data=df, alpha=0.7)
plt.title('Antigüedad de Vehículos vs Tiempo de Reparación', fontsize=14)
plt.xlabel('Antigüedad Promedio de Vehículos (años)', fontsize=12)
plt.ylabel('Tiempo Promedio de Reparación (horas)', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend(title='Tipo de Taller', fontsize=10)
plt.tight_layout()
plt.savefig(os.path.join(graphs_dir, 'antiguedad_vs_tiempo_reparacion.png'))
plt.close()

# Conclusiones
print("\n" + "=" * 60)
print("CONCLUSIONES")
print("=" * 60)

# Talleres Premium VW vs otros tipos
eficiencia_por_tipo = df.groupby('Tipo_Taller')['KPI_Eficiencia'].mean().sort_values(ascending=False)
print("\nEficiencia promedio por tipo de taller:")
print(eficiencia_por_tipo)

reparaciones_por_tipo = df.groupby('Tipo_Taller')['Reparaciones_Realizadas'].mean().sort_values(ascending=False)
print("\nReparaciones promedio por tipo de taller:")
print(reparaciones_por_tipo)

# Factores más influyentes según el mejor modelo (si es RandomForest)
if best_model_name == "Random Forest":
    print("\nFactores más influyentes en la productividad de talleres:")
    feature_importances = results[best_model_name]['model'].feature_importances_
    feature_importance_dict = dict(zip(selected_features, feature_importances))
    sorted_features = sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True)
    for feature, importance in sorted_features:
        print(f"- {feature}: {importance:.4f}")

print("\nTodos los gráficos han sido guardados en la carpeta 'graficos'")
print("=" * 60) 
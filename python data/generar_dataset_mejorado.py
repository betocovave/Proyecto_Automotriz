import pandas as pd
import numpy as np
import random
import os

# Configuración para reproducibilidad
np.random.seed(42)
random.seed(42)

# Número de talleres a generar
num_talleres = 100

# Crear listas para cada tipo de variable
tipos_taller = ["Premium VW", "Concesionario", "Concesionario VW", "Independiente"]
pesos_tipos = [0.25, 0.3, 0.15, 0.3]  # Pesos para la distribución de tipos

# Función que genera datos con correlaciones realistas
def generar_dataset():
    # Inicializar listas para cada columna
    data = {
        'Tipo_Taller': np.random.choice(tipos_taller, size=num_talleres, p=pesos_tipos),
        'Citas_Diarias': np.zeros(num_talleres),
        'Mecanicos_Disponibles': np.zeros(num_talleres),
        'Tiempo_Promedio_Reparacion': np.zeros(num_talleres),
        'Satisfaccion_Cliente': np.zeros(num_talleres),
        'Reparaciones_Realizadas': np.zeros(num_talleres),
        'KPI_Eficiencia': np.zeros(num_talleres),
        'Ingresos_Promedio': np.zeros(num_talleres),
        'Antigüedad_Promedio_Vehiculos': np.zeros(num_talleres),
        'Capacitacion_Tecnicos': np.zeros(num_talleres),
        'Piezas_Disponibles_Ratio': np.zeros(num_talleres)
    }
    
    # Generar datos para cada taller
    for i in range(num_talleres):
        tipo = data['Tipo_Taller'][i]
        
        # Valores base según tipo de taller
        if tipo == "Premium VW":
            # Los talleres Premium VW tienen más mecánicos, mejor capacitación, más piezas
            mecanicos_base = random.randint(10, 15)
            capacitacion_base = random.randint(7, 10)
            piezas_base = random.uniform(0.8, 0.95)
            tiempo_base = random.uniform(2.0, 3.0)
            citas_base = random.randint(15, 25)
            
        elif tipo == "Concesionario VW":
            mecanicos_base = random.randint(8, 12)
            capacitacion_base = random.randint(6, 9)
            piezas_base = random.uniform(0.7, 0.9)
            tiempo_base = random.uniform(2.5, 3.5)
            citas_base = random.randint(12, 20)
            
        elif tipo == "Concesionario":
            mecanicos_base = random.randint(6, 10)
            capacitacion_base = random.randint(5, 8)
            piezas_base = random.uniform(0.65, 0.85)
            tiempo_base = random.uniform(3.0, 4.0)
            citas_base = random.randint(10, 18)
            
        else:  # Independiente
            mecanicos_base = random.randint(3, 8)
            capacitacion_base = random.randint(3, 7)
            piezas_base = random.uniform(0.4, 0.75)
            tiempo_base = random.uniform(3.5, 5.0)
            citas_base = random.randint(5, 15)
        
        # Asignar valores con variación aleatoria
        data['Mecanicos_Disponibles'][i] = mecanicos_base
        data['Capacitacion_Tecnicos'][i] = capacitacion_base
        data['Piezas_Disponibles_Ratio'][i] = piezas_base + random.uniform(-0.05, 0.05)
        data['Piezas_Disponibles_Ratio'][i] = max(0.1, min(1.0, data['Piezas_Disponibles_Ratio'][i]))  # Limitar entre 0.1 y 1.0
        
        # El tiempo de reparación se influencia por la capacitación y disponibilidad de piezas
        factor_mejora = (data['Capacitacion_Tecnicos'][i] / 10) * 0.6 + (data['Piezas_Disponibles_Ratio'][i]) * 0.4
        data['Tiempo_Promedio_Reparacion'][i] = tiempo_base * (1 - factor_mejora * 0.3)
        
        # Citas diarias y reparaciones
        data['Citas_Diarias'][i] = citas_base
        max_reparaciones = data['Citas_Diarias'][i] * 0.9  # No todas las citas resultan en reparaciones
        factor_reparacion = (data['Mecanicos_Disponibles'][i] / 15) * 0.5 + (1 / data['Tiempo_Promedio_Reparacion'][i]) * 0.5
        data['Reparaciones_Realizadas'][i] = int(max_reparaciones * factor_reparacion * random.uniform(0.9, 1.1))
        
        # Satisfacción del cliente
        base_satisfaccion = 0.0
        if tipo == "Premium VW":
            base_satisfaccion = random.uniform(0.7, 0.9)
        elif tipo == "Concesionario VW":
            base_satisfaccion = random.uniform(0.65, 0.85)
        elif tipo == "Concesionario":
            base_satisfaccion = random.uniform(0.6, 0.8)
        else:
            base_satisfaccion = random.uniform(0.5, 0.75)
        
        # La satisfacción se ve afectada por el tiempo de reparación y disponibilidad de piezas
        factor_tiempo = 1 - (data['Tiempo_Promedio_Reparacion'][i] / 5)  # Normalizado a 5 horas como máximo
        data['Satisfaccion_Cliente'][i] = base_satisfaccion * 0.6 + factor_tiempo * 0.3 + data['Piezas_Disponibles_Ratio'][i] * 0.1
        data['Satisfaccion_Cliente'][i] = max(0.5, min(1.0, data['Satisfaccion_Cliente'][i]))  # Limitar entre 0.5 y 1.0
        
        # KPI de eficiencia
        capacidad_teorica = data['Mecanicos_Disponibles'][i] * (8 / data['Tiempo_Promedio_Reparacion'][i])  # 8 horas laborales
        data['KPI_Eficiencia'][i] = min(1.0, data['Reparaciones_Realizadas'][i] / capacidad_teorica)
        
        # Ingresos promedio
        ingreso_base_por_tipo = {
            "Premium VW": random.uniform(1800, 2500),
            "Concesionario VW": random.uniform(1500, 2000),
            "Concesionario": random.uniform(1200, 1800),
            "Independiente": random.uniform(800, 1500)
        }
        data['Ingresos_Promedio'][i] = int(ingreso_base_por_tipo[tipo] * 
                                          (1 + data['Satisfaccion_Cliente'][i] * 0.2))  # La satisfacción influye en el precio
        
        # Antigüedad promedio de vehículos
        if tipo == "Premium VW":
            data['Antigüedad_Promedio_Vehiculos'][i] = random.uniform(1.5, 4.0)
        elif tipo == "Concesionario VW":
            data['Antigüedad_Promedio_Vehiculos'][i] = random.uniform(2.0, 5.0)
        elif tipo == "Concesionario":
            data['Antigüedad_Promedio_Vehiculos'][i] = random.uniform(3.0, 6.0)
        else:
            data['Antigüedad_Promedio_Vehiculos'][i] = random.uniform(4.0, 10.0)
    
    # Convertir a DataFrame
    df = pd.DataFrame(data)
    
    # Ajustes finales y limpieza
    df['Reparaciones_Realizadas'] = df['Reparaciones_Realizadas'].astype(int)
    df['Mecanicos_Disponibles'] = df['Mecanicos_Disponibles'].astype(int)
    df['Citas_Diarias'] = df['Citas_Diarias'].astype(int)
    
    return df

# Generar el dataset
df_talleres = generar_dataset()

# Guardar en CSV
df_talleres.to_csv('dataset_talleres_mejorado.csv', index=False)

print(f"Dataset generado con {len(df_talleres)} talleres y guardado en 'dataset_talleres_mejorado.csv'")
print("\nDistribución por tipo de taller:")
print(df_talleres['Tipo_Taller'].value_counts())

print("\nEstadísticas descriptivas:")
print(df_talleres.describe()) 
# Agenda de Reuniones - Meeting Scheduler

Una aplicación web construida con React.js y Firebase para gestionar reuniones con clientes y tareas.

## Características

- 🔐 **Autenticación de usuarios** con Firebase Auth
- 📅 **Programación de reuniones** con datos completos del cliente
- 📊 **Dashboard** con estadísticas en tiempo real
- ✅ **Gestión de tareas** con prioridades y categorías
- 🚨 **Seguimiento de reuniones** (pendientes, completadas, atrasadas, canceladas)
- 🎯 **Sistema de prioridades** para reuniones y tareas
- 📱 **Diseño responsivo** para móviles y desktop
- 🔄 **Actualizaciones en tiempo real** con Firebase

## Configuración inicial

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita Authentication con Email/Password
4. Crea una base de datos Firestore
5. Copia la configuración y actualiza `src/firebase/config.ts`

### 2. Instalación

```bash
# Clonar el repositorio
cd meeting-scheduler

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
src/
├── components/           # Componentes React
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── Login.tsx        # Autenticación
│   ├── Register.tsx     # Registro de usuarios
│   ├── MeetingScheduler.tsx  # Programar reuniones
│   ├── MeetingsList.tsx # Lista de reuniones
│   ├── TaskManager.tsx  # Gestión de tareas
│   ├── Navigation.tsx   # Navegación
│   └── PrivateRoute.tsx # Protección de rutas
├── contexts/            # Contextos React
│   └── AuthContext.tsx  # Contexto de autenticación
├── firebase/            # Configuración Firebase
│   └── config.ts
├── services/            # Servicios Firebase
│   └── firebaseService.ts # Servicio centralizado Firebase
├── types/               # Definiciones TypeScript
│   └── index.ts
└── App.tsx             # Componente principal
```

## Funcionalidades

### Dashboard
- Resumen de reuniones pendientes, completadas y atrasadas
- Estadísticas de tareas
- Vista rápida de próximas reuniones

### Programar Reuniones
- Formulario completo con datos del cliente
- Sistema de prioridades (Alta, Media, Baja)
- Campos adicionales: teléfono y notas
- Validación de horarios

### Gestión de Reuniones
- Lista completa con filtros avanzados
- Estados: pendientes, completadas, atrasadas, canceladas
- Acciones rápidas para cambiar estados
- Vista detallada con toda la información

### Gestión de Tareas
- Crear tareas con prioridades y categorías
- Fechas límite opcionales
- Estados pendiente/completado
- Organización por categorías

## Tecnologías utilizadas

- **React.js** con TypeScript
- **Firebase** (Authentication + Firestore)
- **React Router** para navegación
- **date-fns** para manejo de fechas
- **CSS3** para estilos responsivos
- **Actualizaciones en tiempo real** con Firebase listeners

## Scripts disponibles

```bash
npm start          # Servidor de desarrollo
npm run build      # Build para producción
npm test           # Ejecutar tests
npm run eject      # Exponer configuración webpack
```

## Configuración de producción

1. **Firebase Hosting:**
   ```bash
   npm run build
   firebase deploy
   ```

2. **Variables de entorno:**
   - Crea archivos `.env.local` para desarrollo
   - Configura variables en tu hosting para producción

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
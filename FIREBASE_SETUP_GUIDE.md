# 🔥 Guía de Configuración Firebase

## Error: "El registro con email/contraseña no está habilitado"

### ✅ Pasos para solucionarlo:

1. **Ir a Firebase Console**
   - Abre: https://console.firebase.google.com/
   - Selecciona tu proyecto: `appmeet-a99e7`

2. **Habilitar Authentication**
   - Menú izquierdo → **Authentication**
   - Si es nuevo → Clic en **"Comenzar"**
   - Pestaña **"Sign-in method"**
   - Buscar **"Email/Password"**
   - **ACTIVAR** el toggle
   - Clic en **"Guardar"**

3. **Crear Firestore Database**
   - Menú izquierdo → **Firestore Database**
   - Clic en **"Crear base de datos"**
   - Seleccionar **"Modo de prueba"**
   - Ubicación: **us-central** (recomendado)

4. **Verificar configuración**
   - Authentication → Sign-in method
   - ✅ Email/Password debe estar **Habilitado**
   - ✅ Firestore Database debe estar **Creado**

## 🎯 Una vez configurado:

```bash
npm start
```

Tu aplicación debería funcionar correctamente para registro e inicio de sesión.

## 🚨 Si sigue fallando:

1. **Revisa la configuración en `src/firebase/config.ts`**
2. **Verifica que el proyecto existe**
3. **Asegúrate de que Authentication esté habilitado**
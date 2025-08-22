# 🗂️ Estructura de Firestore Database

## Colecciones que se crean automáticamente:

### 📅 **Colección: `meetings`**
```
meetings/
├── meetingId1/
│   ├── title: "Reunión con cliente"
│   ├── description: "Descripción"
│   ├── clientName: "Juan Pérez"
│   ├── clientEmail: "juan@email.com"
│   ├── clientPhone: "+1234567890"
│   ├── startTime: Timestamp
│   ├── endTime: Timestamp
│   ├── status: "pending" | "completed" | "cancelled"
│   ├── priority: "low" | "medium" | "high"
│   ├── notes: "Notas adicionales"
│   ├── createdBy: "userId"
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
```

### ✅ **Colección: `tasks`**
```
tasks/
├── taskId1/
│   ├── title: "Preparar presentación"
│   ├── description: "Descripción de la tarea"
│   ├── status: "pending" | "completed"
│   ├── priority: "low" | "medium" | "high"
│   ├── category: "Trabajo" | "Personal"
│   ├── dueDate: Timestamp (opcional)
│   ├── relatedMeetingId: "meetingId" (opcional)
│   ├── createdBy: "userId"
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
```

## 🔒 Reglas de seguridad recomendadas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden acceder a sus propios datos
    match /meetings/{meetingId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.createdBy;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
    }
    
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.createdBy;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
    }
  }
}
```

## ✅ Una vez creada la base de datos:

1. **No necesitas crear las colecciones manualmente**
2. **Se crean automáticamente** cuando agregues tu primera reunión/tarea
3. **El nombre de la base es automático** (igual al proyecto)
4. **Tu código ya está configurado** para usar las colecciones correctas
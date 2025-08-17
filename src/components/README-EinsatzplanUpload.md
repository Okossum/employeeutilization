# EinsatzplanUpload Component

## Übersicht
React-Komponente für den Upload von Einsatzplan-Excel-Dateien (.xlsx) an Firebase Storage.

## Features
- ✅ **Drag & Drop Interface** mit Click-Fallback
- ✅ **Progress Tracking** während Upload
- ✅ **File Validation** (.xlsx, max 50MB)
- ✅ **Authentication Check** (nur angemeldete Nutzer)
- ✅ **Toast Notifications** für Success/Error
- ✅ **Auto-Navigation** zu `/einsatzplan/latest` nach erfolgreichem Upload
- ✅ **Responsive Design** mit Tailwind CSS

## Usage

```tsx
import EinsatzplanUpload from '../components/EinsatzplanUpload';

// Einfache Verwendung
<EinsatzplanUpload />

// Mit custom Styling
<EinsatzplanUpload className="my-custom-class" />
```

## Dependencies
- `firebase/storage` - File Upload
- `react-router-dom` - Navigation
- `react-hot-toast` - Notifications
- `../contexts/AuthContext` - Authentication

## Upload Path
Dateien werden gespeichert unter:
```
uploads/einsatzplaene/{userId}/{timestamp}.xlsx
```

## Cloud Function Trigger
Nach erfolgreichem Upload wird automatisch die Cloud Function `onEinsatzplanXlsxUploaded` ausgelöst.

## Validation Rules
- **File Type**: Nur `.xlsx` Dateien
- **File Size**: Maximum 50MB
- **Authentication**: User muss angemeldet sein

## States
- `uploading`: Upload läuft
- `progress`: Upload-Fortschritt (0-100%)
- `isDragOver`: Drag-over State für UI-Feedback

## Error Handling
- Ungültiger Dateityp → Toast-Error
- Zu große Datei → Toast-Error
- Upload-Fehler → Toast-Error + Console-Log
- Nicht angemeldet → Info-Box mit Login-Hinweis

## Example Integration
```tsx
// In einer Upload-Seite
export default function EinsatzplanUploadPage() {
  return (
    <div className="container mx-auto p-8">
      <h1>Einsatzplan hochladen</h1>
      <EinsatzplanUpload className="mt-8" />
    </div>
  );
}
```

## Styling
Verwendet Tailwind CSS Classes:
- Responsive Grid-Layout
- Hover/Focus States
- Color-coded States (Drag, Upload, Error)
- Accessible Button Design

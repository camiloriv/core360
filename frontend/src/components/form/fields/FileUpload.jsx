import { useRef, useState, useEffect } from "react";
import Swal from "sweetalert2";

function FileUpload({ archivos = [], setFiles }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Si se vacía el estado global, limpiamos el input de la UI
  useEffect(() => {
    if (archivos.length === 0 && inputRef.current) {
      inputRef.current.value = ""; 
    }
  }, [archivos]);

  const handleFiles = (newFilesArray) => {
    const existingNames = archivos.map(f => f.name);
    // Filtrar archivos que ya existen para evitar duplicados exactos
    const toAdd = newFilesArray.filter(f => !existingNames.includes(f.name));
    
    if (toAdd.length > 0) {
      const currentSize = archivos.reduce((acc, file) => acc + file.size, 0);
      const newSize = toAdd.reduce((acc, file) => acc + file.size, 0);
      const MAX_SIZE_MB = 20;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

      if (currentSize + newSize > MAX_SIZE_BYTES) {
        Swal.fire({
          icon: "warning",
          title: "Límite excedido",
          text: `El tamaño total de los archivos adjuntos supera el límite de ${MAX_SIZE_MB}MB.`,
          confirmButtonColor: "#3085d6"
        });
      } else {
        setFiles([...archivos, ...toAdd]);
      }
    }
    // Limpiar input para permitir seleccionar el mismo archivo si se eliminó
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleRemove = (indexToRemove) => {
    const newFiles = archivos.filter((_, idx) => idx !== indexToRemove);
    setFiles(newFiles);
  };

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
      e.dataTransfer.clearData();
    }
  };

  // Función para formatear el peso en KB/MB
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="field full">
      <label>Archivos Adjuntos</label>

      <div
        className={`file-upload-zone ${isDragOver ? "dragover" : ""}`}
        onClick={() => inputRef.current.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="upload-icon">📁</span>
        <p>Haz clic para adjuntar archivos o arrástralos aquí (Máx 20MB total)</p>
        <input
          type="file"
          multiple
          ref={inputRef}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>

      {archivos.length > 0 && (
        <div className="file-upload-list">
          {archivos.map((file, index) => (
            <div key={index} className="file-upload-item">
              <div className="file-upload-item-name">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>
                  {file.name} 
                  <span style={{ color: "#9ca3af", fontSize: "11px", marginLeft: "6px" }}>
                    ({formatBytes(file.size)})
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={() => handleRemove(index)}
                title="Quitar archivo"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;

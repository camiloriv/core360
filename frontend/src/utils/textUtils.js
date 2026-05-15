export const capitalizar = (texto = "") => {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p) // elimina espacios vacíos
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

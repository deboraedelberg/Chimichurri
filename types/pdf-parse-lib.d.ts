// El índice de pdf-parse ejecuta código de debug al importarse desde Next,
// así que importamos el módulo interno directamente.
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdf from "pdf-parse";
  export default pdf;
}

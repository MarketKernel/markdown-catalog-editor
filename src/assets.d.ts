/** Files the build inlines as strings (the `text` loader in build.mjs and tools/load.mjs). */
declare module '*.html' {
  const text: string;
  export default text;
}
declare module '*.css' {
  const text: string;
  export default text;
}

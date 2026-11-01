// Font files imported as URLs (Remotion's webpack config emits them as assets).
declare module "*.ttf" {
  const url: string;
  export default url;
}

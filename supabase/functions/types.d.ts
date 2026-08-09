declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(...args: any[]): any;
}

declare module 'npm:web-push' {
  const webpush: any;
  export default webpush;
}

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  env: { get(name: string): string | undefined };
};

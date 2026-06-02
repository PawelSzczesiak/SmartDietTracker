import type { APIRoute } from "astro";

export function buildPostContext(pathname: string, formData: FormData, userId = "user-1"): Parameters<APIRoute>[0] {
  return {
    request: new Request(`http://localhost${pathname}`, { method: "POST", body: formData }),
    locals: {
      user: {
        id: userId,
      },
    },
    cookies: {},
    redirect: (location: string) => new Response(null, { status: 302, headers: { Location: location } }),
  } as unknown as Parameters<APIRoute>[0];
}

export function getRedirectLocation(response: Response) {
  return response.headers.get("Location") ?? "";
}

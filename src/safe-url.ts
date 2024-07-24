export function safeUrl(url: string) {
  return url.replace(/[+]/g, encodeURIComponent("+"))
}

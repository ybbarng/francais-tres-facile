export const RFI_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Ch-Ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
};

export const RFI_BASE_URL = "https://francaisfacile.rfi.fr";
export const RFI_PODCAST_URL = `${RFI_BASE_URL}/fr/podcasts/journal-en-fran%C3%A7ais-facile/`;
export const RFI_EXERCICES_URL = RFI_PODCAST_URL;

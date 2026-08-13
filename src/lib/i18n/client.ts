export function setUserLocale(locale: string) {
  // 1. Update the cookie
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  
  // 2. Update DB if authenticated
  // TODO: Send request to API to update user language preference
}

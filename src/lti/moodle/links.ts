type MoodleURIs = {
  auth: string
  certs: string
  token: string
}

export default function moodleUris(iss: string): MoodleURIs {
  return {
    auth: `${iss}/mod/lti/auth.php`,
    certs: `${iss}/mod/lti/certs.php`,
    token: `${iss}/mod/lti/token.php`,
  }
}

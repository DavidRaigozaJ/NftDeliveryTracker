const userId = args[0]
const userName = args[1]
const origin = args[2] // e.g. "New York City"
const destination = args[3] // e.g. "Washington DC"
const deliveryEmail = args[4]
const verifiedSender = args[5] // Add this line

// Google Maps API Endpoint
const GOOGLE_MAPS_API_ENDPOINT = "https://maps.googleapis.com/maps/api/distancematrix/json"

// Get the Google Maps API Key from the environment variables
const googleMapsApiKey = secrets.googleMapsApiKey
if (!googleMapsApiKey) {
  throw new Error("GOOGLE_MAPS_API_KEY environment variable not set or invalid")
}

// Track the delivery using Google Maps API
const trackingResult = await Functions.makeHttpRequest({
  url: `${GOOGLE_MAPS_API_ENDPOINT}?origins=${origin}&destinations=${destination}&departure_time=now&key=${googleMapsApiKey}`,
})

// Handle API error.
if (trackingResult.error) {
  const returnedErr = trackingResult.response.data
  let apiErr = new Error(`Google Maps API returned an error: ${JSON.stringify(returnedErr)}`)
  apiErr.returnedErr = returnedErr
  throw apiErr
}

// Check that the response contains the expected data
if (
  !trackingResult.data.rows ||
  !trackingResult.data.rows[0] ||
  !trackingResult.data.rows[0].elements ||
  !trackingResult.data.rows[0].elements[0]
) {
  throw new Error("Google Maps API returned an unexpected response structure")
}

// Extract the distance and duration from the response
const distance = trackingResult.data.rows[0].elements[0].distance.text
const duration = trackingResult.data.rows[0].elements[0].duration.text

console.log(`Distance: ${distance}, Duration: ${duration}`)

// Send an email using Twilio SendGrid API
if (!secrets.twilioApiKey) {
  throw new Error("TWILIO_API_KEY environment variable not set or invalid")
}

// Build the email content
const emailContent = {
  personalizations: [
    {
      to: [{ email: deliveryEmail }],
      subject: "Delivery Update",
    },
  ],
  from: { email: verifiedSender },
  content: [
    {
      type: "text/plain",
      value: `Your delivery is ${distance} away and will arrive in approximately ${duration}.`,
    },
  ],
}

// Send the email
const sendEmailResult = await Functions.makeHttpRequest({
  url: "https://api.sendgrid.com/v3/mail/send",
  method: "POST",
  headers: { Authorization: `Bearer ${secrets.twilioApiKey}` },
  data: emailContent,
})

// Handle API error.
if (sendEmailResult.error) {
  const returnedErr = sendEmailResult.response.data
  let apiErr = new Error(`Twilio SendGrid API returned an error: ${JSON.stringify(returnedErr)}`)
  apiErr.returnedErr = returnedErr
  throw apiErr
}

return Functions.encodeString("Email sent successfully.")

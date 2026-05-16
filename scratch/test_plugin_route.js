async function testPluginRoute() {
  const response = await fetch('http://localhost:3000/api/plugins/booking/check-availability', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listingId: '1',
      checkIn: '2025-06-15',
      checkOut: '2025-06-20',
      adults: 2,
    }),
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testPluginRoute();

const DEGREES = Math.PI / 180;

/**
 * Is the sun above the horizon at this place and time? Uses the standard
 * low-precision solar position formulas, which are accurate to a few minutes.
 */
export function sunIsUp(date: Date, latitude: number, longitude: number): boolean {
  const daysSince2000 = date.getTime() / 864e5 - 10957.5; // since 2000-01-01 12:00 UTC

  // Where the sun is along its yearly path.
  const meanAnomaly = (357.529 + 0.98560028 * daysSince2000) * DEGREES;
  const meanLongitude = 280.459 + 0.98564736 * daysSince2000;
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEGREES;
  const axialTilt = (23.439 - 0.00000036 * daysSince2000) * DEGREES;

  // Its position in the sky.
  const rightAscension = Math.atan2(Math.cos(axialTilt) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(axialTilt) * Math.sin(eclipticLongitude));

  // How far it is from overhead where you are.
  const siderealHours = (18.697374558 + 24.06570982441908 * daysSince2000) % 24;
  const hourAngle = (siderealHours * 15 + longitude) * DEGREES - rightAscension;
  const latitudeRadians = latitude * DEGREES;
  const altitude = Math.asin(
    Math.sin(latitudeRadians) * Math.sin(declination) +
      Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
  );

  // -0.833° accounts for the sun's radius and the atmosphere bending light at the horizon.
  return altitude / DEGREES > -0.833;
}

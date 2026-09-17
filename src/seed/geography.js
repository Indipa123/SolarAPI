const provinces = [
  ['Western', 'WP'], ['Central', 'CP'], ['Southern', 'SP'], ['Northern', 'NP'], ['Eastern', 'EP'],
  ['North Western', 'NWP'], ['North Central', 'NCP'], ['Uva', 'UP'], ['Sabaragamuwa', 'SGP'],
].map(([name, code]) => ({ name, code }));

const districts = [
  ['Colombo', 'CO', 'WP'], ['Gampaha', 'GA', 'WP'], ['Kalutara', 'KT', 'WP'],
  ['Kandy', 'KD', 'CP'], ['Matale', 'MT', 'CP'], ['Nuwara Eliya', 'NE', 'CP'],
  ['Galle', 'GL', 'SP'], ['Matara', 'MA', 'SP'], ['Hambantota', 'HB', 'SP'],
  ['Jaffna', 'JA', 'NP'], ['Kilinochchi', 'KI', 'NP'], ['Mannar', 'MN', 'NP'], ['Mullaitivu', 'MU', 'NP'], ['Vavuniya', 'VA', 'NP'],
  ['Trincomalee', 'TC', 'EP'], ['Batticaloa', 'BT', 'EP'], ['Ampara', 'AM', 'EP'],
  ['Kurunegala', 'KU', 'NWP'], ['Puttalam', 'PU', 'NWP'],
  ['Anuradhapura', 'AN', 'NCP'], ['Polonnaruwa', 'PO', 'NCP'],
  ['Badulla', 'BD', 'UP'], ['Monaragala', 'MO', 'UP'],
  ['Ratnapura', 'RA', 'SGP'], ['Kegalle', 'KE', 'SGP'],
].map(([name, code, provinceCode]) => ({ name, code, provinceCode }));

const substations = [
  ['Colombo Grid Substation', 'GS-CO', 'CO', 6.9271, 79.8612], ['Negombo Grid Substation', 'GS-GA', 'GA', 7.2083, 79.8358], ['Kalutara Grid Substation', 'GS-KT', 'KT', 6.5854, 79.9607],
  ['Kandy Grid Substation', 'GS-KD', 'KD', 7.2906, 80.6337], ['Matale Grid Substation', 'GS-MT', 'MT', 7.4675, 80.6234], ['Nuwara Eliya Grid Substation', 'GS-NE', 'NE', 6.9497, 80.7891],
  ['Galle Grid Substation', 'GS-GL', 'GL', 6.0535, 80.2210], ['Matara Grid Substation', 'GS-MA', 'MA', 5.9549, 80.5550], ['Hambantota Grid Substation', 'GS-HB', 'HB', 6.1241, 81.1185],
  ['Jaffna Grid Substation', 'GS-JA', 'JA', 9.6615, 80.0255], ['Kilinochchi Grid Substation', 'GS-KI', 'KI', 9.3803, 80.3770], ['Mannar Grid Substation', 'GS-MN', 'MN', 8.9810, 79.9044], ['Mullaitivu Grid Substation', 'GS-MU', 'MU', 9.2671, 80.8142], ['Vavuniya Grid Substation', 'GS-VA', 'VA', 8.7514, 80.4971],
  ['Trincomalee Grid Substation', 'GS-TC', 'TC', 8.5874, 81.2152], ['Batticaloa Grid Substation', 'GS-BT', 'BT', 7.7170, 81.7000], ['Ampara Grid Substation', 'GS-AM', 'AM', 7.2970, 81.6820],
  ['Kurunegala Grid Substation', 'GS-KU', 'KU', 7.4818, 80.3609], ['Puttalam Grid Substation', 'GS-PU', 'PU', 8.0362, 79.8283],
  ['Anuradhapura Grid Substation', 'GS-AN', 'AN', 8.3114, 80.4037], ['Polonnaruwa Grid Substation', 'GS-PO', 'PO', 7.9403, 81.0188],
  ['Badulla Grid Substation', 'GS-BD', 'BD', 6.9934, 81.0550], ['Monaragala Grid Substation', 'GS-MO', 'MO', 6.8714, 81.3507],
  ['Ratnapura Grid Substation', 'GS-RA', 'RA', 6.6828, 80.3992], ['Kegalle Grid Substation', 'GS-KE', 'KE', 7.2513, 80.3464],
].map(([name, code, districtCode, latitude, longitude]) => ({ name, code, districtCode, latitude, longitude }));

module.exports = { provinces, districts, substations };

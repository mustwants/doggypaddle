// DoggyPaddle - Clear Fake Sample Data from localStorage
// Run this script in your browser console to clear fake data and inspect your localStorage

console.log('=== DoggyPaddle localStorage Inspector ===\n');

// Check current data
const products = JSON.parse(localStorage.getItem('doggypaddle_products') || '[]');
const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
const timeslots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');

console.log(`Current Products (${products.length}):`);
console.table(products.map(p => ({ id: p.id, name: p.name, category: p.category })));

console.log(`\nCurrent Photos (${photos.length}):`);
console.table(photos.map(p => ({ dogName: p.dogName, customerName: p.customerName, status: p.status, sessionDate: p.sessionDate })));

console.log(`\nCurrent Timeslots (${timeslots.length}):`);
console.table(timeslots.map(t => ({ date: t.date, time: t.time, status: t.status })));

// Check if data is fake sample data
const hasFakeProducts = products.some(p => p.id === 'prod-1' && p.name === 'Dog Treats - Peanut Butter');
const hasFakePhotos = photos.some(p => p.dogName === 'Max' || p.dogName === 'Bella');

if (hasFakeProducts || hasFakePhotos) {
  console.warn('\n⚠️  FAKE SAMPLE DATA DETECTED ⚠️');
  console.log('\nTo clear fake data and start fresh, run:');
  console.log('%c  clearFakeData()', 'color: red; font-weight: bold; font-size: 14px;');
}

// Function to clear fake data
window.clearFakeData = function() {
  const confirm = window.confirm(
    'This will DELETE all products and photos from localStorage.\n\n' +
    'Timeslots will be preserved.\n\n' +
    'Are you sure you want to continue?'
  );

  if (confirm) {
    localStorage.removeItem('doggypaddle_products');
    localStorage.removeItem('doggypaddle_photos');
    console.log('%c✓ Cleared products and photos from localStorage', 'color: green; font-weight: bold;');
    console.log('Reload the page to see changes.');
  }
};

// Function to backup data
window.backupData = function() {
  const backup = {
    products: products,
    photos: photos,
    timeslots: timeslots,
    timestamp: new Date().toISOString()
  };

  const json = JSON.stringify(backup, null, 2);
  console.log('=== BACKUP DATA (Copy this!) ===');
  console.log(json);

  // Also create downloadable file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doggypaddle-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  console.log('%c✓ Backup file downloaded!', 'color: green; font-weight: bold;');
};

// Function to restore data from backup
window.restoreData = function(backupData) {
  if (typeof backupData === 'string') {
    backupData = JSON.parse(backupData);
  }

  if (backupData.products) {
    localStorage.setItem('doggypaddle_products', JSON.stringify(backupData.products));
    console.log(`%c✓ Restored ${backupData.products.length} products`, 'color: green; font-weight: bold;');
  }

  if (backupData.photos) {
    localStorage.setItem('doggypaddle_photos', JSON.stringify(backupData.photos));
    console.log(`%c✓ Restored ${backupData.photos.length} photos`, 'color: green; font-weight: bold;');
  }

  if (backupData.timeslots) {
    localStorage.setItem('doggypaddle_timeslots', JSON.stringify(backupData.timeslots));
    console.log(`%c✓ Restored ${backupData.timeslots.length} timeslots`, 'color: green; font-weight: bold;');
  }

  console.log('Reload the page to see changes.');
};

console.log('\n=== Available Commands ===');
console.log('backupData()     - Download backup of current data');
console.log('clearFakeData()  - Clear products and photos (keeps timeslots)');
console.log('restoreData(backup) - Restore from backup object');
console.log('\nExample restore: restoreData({ products: [...], photos: [...] })');

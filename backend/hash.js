const bcrypt = require('bcrypt');

bcrypt.hash('solarsur2026', 10).then(hash => {
  console.log(hash);
});
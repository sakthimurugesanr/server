
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');


const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Enable JSON parsing

// MySQL Database Connection
// const db = mysql.createConnection({
//   host: '193.203.184.74',
//   user: 'u534462265_courier', // Replace with your MySQL username
//   password: 'ASGlobal@12345', // Replace with your MySQL password
//   database: 'u534462265_courier' // Replace with your database name
// });

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: 'Sathyabama', // Replace with your MySQL password
  database: 'waybill_tracker' // Replace with your database name
});


db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});





// Create a user if it doesn't exist
const username = 'Admin'; 
const password = 'Admin'; 

bcrypt.hash(password, 10, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return;
    }

    if (results.length > 0) {
      console.log('User already exists!');
      return;
    }

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        console.error('Error inserting user into database:', err);
      } else {
        console.log('User created successfully!');
      }
    });
  });
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, 'lokananthan', { expiresIn: '5h' });
    res.json({ token });
  });
});

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, 'lokananthan', (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Configure Multer for File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// const headerNames = {
//     waybill_no: ['Waybill Number', 'AWB No', 'Waybill_No'],
//     order_id: ['Order #', 'From', 'Order_ID'],
//     destination_city: ['destination_city', 'Curr. Dest. HUB', 'Dest City'],
//     order_date: ['Order Date', 'Date', 'Date'],
//     weight: ['Weight', 'Wgt', 'Weight_kg']
//   };
  
//   // Function to get the index of the first matching header
//   const getHeaderIndex = (headers, fieldNames) => {
//     for (const name of fieldNames) {
//       const index = headers.indexOf(name);
//       if (index !== -1) return index;
//     }
//     return -1; // Return -1 if no matching header is found
//   };
  
//   // Endpoint to Upload Excel/CSV File
//   app.post('/upload',authenticateToken, upload.single('file'), (req, res) => {
//     const file = req.file;
//     if (!file) {
//       return res.status(400).send('No file uploaded');
//     }
  
//     let data = [];
  
//     try {
//       if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
//         // Parse CSV file
//         const csv = file.buffer.toString();
//         const rows = csv.split('\n').filter(row => row.trim() !== '');
//         const headers = rows[0].split(',').map(header => header.trim());
  
//         const weightIndex = getHeaderIndex(headers, headerNames.weight);
//         const weightHeader = weightIndex !== -1 ? headers[weightIndex] : '';
  
//         data = rows.slice(1).map(row => {
//           const values = row.split(',').map(value => value.trim());
//           const weightValue = weightIndex !== -1 ? parseFloat(values[weightIndex]) : 0;
  
//           return {
//             waybill_no: values[getHeaderIndex(headers, headerNames.waybill_no)] || null,
//             order_id: values[getHeaderIndex(headers, headerNames.order_id)] || '',
//             destination_city: values[getHeaderIndex(headers, headerNames.destination_city)] || '',
//             order_date: new Date(values[getHeaderIndex(headers, headerNames.order_date)]) || null,
//             weight: weightHeader === 'Wgt' ? weightValue * 1000 : weightValue // Convert kg to grams if header is 'Weight_kg'
//           };
//         });
//       } else {
//         // Parse Excel file
//         const workbook = xlsx.read(file.buffer, { type: 'buffer' });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const jsonData = xlsx.utils.sheet_to_json(sheet, { raw: false });
  
//         const weightHeader = headerNames.weight.find(name => name in jsonData[0]) || '';
//         data = jsonData.map((row) => {
//           const weightValue = weightHeader ? parseFloat(row[weightHeader]) : 0;
  
//           return {
//             waybill_no: row[headerNames.waybill_no.find(name => name in row)] || null,
//             order_id: row[headerNames.order_id.find(name => name in row)] || '',
//             destination_city: row[headerNames.destination_city.find(name => name in row)] || '',
//             order_date: new Date(row[headerNames.order_date.find(name => name in row)] || '') || null,
//             weight: weightHeader === 'Wgt' ? weightValue * 1000 : weightValue // Convert kg to grams if column is 'Weight_kg'
//           };
//         });
//       }
//     } catch (err) {
//       console.error('Error parsing file:', err);
//       return res.status(400).send('Error parsing file');
//     }
  
//     let rates = {
//       'Tamil Nadu & Pondicherry': { amount250: 30, amount1000: 40, additional500: 20 },
//       'Kerala & Karnataka': { amount250: 60, amount1000: 70, additional500: 40 },
//       'Andhra Pradesh & Telangana': { amount250: 70, amount1000: 90, additional500: 50 },
//       'North': { amount250: 90, amount1000: 120, additional500: 70 },
//       'West': { amount250: 80, amount1000: 120, additional500: 70 },
//       'East': { amount250: 120, amount1000: 130, additional500: 80 },
//       'North East': { amount250: 130, amount1000: 140, additional500: 90 },
//       'Special Location': { amount250: 150, amount1000: 180, additional500: 110 },
//       'Coimbatore and Local': { amount250: 25, amount1000: 35, additional500: 20 }
//     };
    
//     // Endpoint to Get Current Rates
//     app.get('/rates', (req, res) => {
//       res.json(rates);
//     });
    
//     // Endpoint to Update Rates
//     app.put('/rates', (req, res) => {
//       rates = req.body; // Update rates in-memory
//       res.send('Rates updated successfully');
//     });
    
//     // Function to calculate amount based on weight and region
//     const calculateAmount = (weight, region) => {
//       const { amount250, amount1000, additional500 } = rates[region] || rates['Tamil Nadu & Pondicherry'];
//       let totalAmount = 0;
    
//       if (weight <= 250) {
//         totalAmount = amount250;
//       } else if (weight <= 1000) {
//         totalAmount = amount1000;
//       } else if (weight <= 1500) {
//         totalAmount = amount1000 + additional500;
//       } else {
//         const weightStr = weight.toString().padStart(6, '0');
//         const lastThree = parseInt(weightStr.slice(-3), 10);
//         const remaining = parseInt(weightStr.slice(0, -3), 10) || 0;
    
//         if (lastThree === 0) {
//           totalAmount = remaining * amount1000;
//         } else if (lastThree <= 500) {
//           totalAmount = (remaining * amount1000) + additional500;
//         } else {
//           totalAmount = (remaining + 1) * amount1000;
//         }
//       }
    
//       return totalAmount;
//     };

// // Endpoint to Upload Excel/CSV File


//   // Fetch state_code and amount_per_gram for each destination_city from weights table
//   db.query('SELECT destination_city, state_code, region FROM weights', (err, weightResults) => {
//     if (err) {
//       console.error('Error fetching weights data:', err);
//       return res.status(500).send('Error fetching weights data');
//     }

//     const weightMap = weightResults.reduce((acc, row) => {
//       acc[row.destination_city] = {
//         state_code: row.state_code,
//         region: row.region
//       };
//       return acc;
//     }, {});

//     // Calculate Amount and prepare data for insertion
//     const processedData = data.map(item => {
//       const weightInfo = weightMap[item.destination_city] || {};
//       const amount = calculateAmount(item.weight, weightInfo.region || 'Tamil Nadu & Pondicherry');

//       return {
//         ...item,
//         amount,
//         destination_city: weightInfo.state_code ? `${item.destination_city} ${weightInfo.state_code}` : item.destination_city
//       };
//     });

//     // Delete existing data from waybills table
//     db.query('DELETE FROM waybills', (err) => {
//       if (err) {
//         console.error('Error deleting old data from waybills:', err);
//         return res.status(500).send('Error deleting old data from waybills');
//       }

//       // Insert new data into MySQL
//       const query = 'INSERT INTO waybills (waybill_no, order_id, destination_city, order_date, weight, amount) VALUES ?';
//       const values = processedData.map(item => [
//         item.waybill_no,
//         item.order_id,
//         item.destination_city,
//         item.order_date,
//         item.weight,
//         item.amount
//       ]);

//       db.query(query, [values], (err) => {
//         if (err) {
//           console.error('Error inserting data into MySQL:', err);
//           return res.status(500).send('Error inserting data into database');
//         }
//         console.log('Data inserted successfully');
//         res.json(processedData);
//       });
//     });
//   });
// });

// // Endpoint to Retrieve Data from MySQL
// app.get('/waybills', (req, res) => {
//   const query = 'SELECT waybill_no, order_id, destination_city, order_date, weight, amount FROM waybills';

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error('Error fetching data from MySQL:', err);
//       return res.status(500).send('Error fetching data from database');
//     }
//     res.json(results);
//   });
// });

// // Endpoint to Edit a Record
// app.put('/waybills/:waybill_no', (req, res) => {
//   const { waybill_no } = req.params;
//   const { order_id, destination_city, order_date, weight, amount } = req.body;

//   const query = 
//     `UPDATE waybills
//     SET order_id = ?, destination_city = ?, order_date = ?, weight = ?, amount = ?
//     WHERE waybill_no = ?`
//   ;
  
//   db.query(query, [order_id, destination_city, new Date(order_date), weight, amount, waybill_no], (err) => {
//     if (err) {
//       console.error('Error updating record:', err);
//       return res.status(500).json({ error: 'Error updating record' });
//     }
//     res.json({ message: 'Record updated successfully' });
//   });
// });

// // Endpoint to Delete a Record
// app.delete('/waybills/:waybill_no', (req, res) => {
//   const { waybill_no } = req.params;

//   const query = 'DELETE FROM waybills WHERE waybill_no = ?';

//   db.query(query, [waybill_no], (err) => {
//     if (err) {
//       console.error('Error deleting record:', err);
//       return res.status(500).json({ error: 'Error deleting record' });
//     }
//     res.json({ message: 'Record deleted successfully' });
//   });
// });
// app.get('/weights', (req, res) => {
//   const query = 'SELECT * FROM weights'; // Select all columns or specify if needed

//   db.query(query, (err, results) => {
//       if (err) {
//           console.error('Error fetching weight entries from MySQL:', err);
//           return res.status(500).send('Error fetching weight entries');
//       }
//       res.json(results);
//   });
// });



// app.post('/weights', (req, res) => {
//   const { destination_city, state_code, region } = req.body;

//   // Ensure all required fields are provided
//   if (!destination_city || !state_code || !region) {
//     return res.status(400).send('All fields are required');
//   }

//   const query = 'INSERT INTO weights (destination_city, state_code, region) VALUES (?, ?, ?)';
//   db.query(query, [destination_city, state_code, region], (err) => {
//     if (err) {
//       console.error('Error inserting weight entry:', err);
//       return res.status(500).send('Error inserting weight entry');
//     }
//     res.send('Weight entry added successfully');
//   });
// });

// // app.post('/weights', (req, res) => {
// //   const { destination_city, state_code, region } = req.body;
// //   const query = 'INSERT INTO weights (destination_city, state_code, region) VALUES (?, ?, ?)';
// //   db.query(query, [destination_city, state_code, region], (err, result) => {
// //     if (err) {
// //       console.error('Error inserting data:', err);
// //       return res.status(500).send('Server Error');
// //     }
// //     res.status(201).send(result);
// //   });
// // });
// // Update weight
// app.put('/weights/:id',async (req, res) => {
//   const { id } = req.params;
//   const  { destination_city, state_code, region } = await req.body;

//   // Validate input
//   if (!destination_city || !state_code || !region) {
//       return res.status(400).send('All fields are required');
//   }

//   const query = 'UPDATE weights SET destination_city = ?, state_code = ?, region = ? WHERE id = ?';
//   db.query(query, [destination_city, state_code, region, id], (err) => {
//       if (err) {
//           console.error('Error updating weight entry:', err);
//           return res.status(500).send('Error updating weight entry');
//       }
//       res.send('Weight entry updated successfully');
//   });
// });

// // Delete weight
// app.delete('/weights/:id', (req, res) => {
//   const { id } = req.params;

//   const query = 'DELETE FROM weights WHERE id = ?';
//   db.query(query, [id], (err) => {
//       if (err) {
//           console.error('Error deleting weight entry:', err);
//           return res.status(500).send('Error deleting weight entry');
//       }
//       res.send('Weight entry deleted successfully');
//   });
// });

// // app.put('/weights/:id', (req, res) => {
// //   const { id } = req.params;
// //   const updatedWeight = req.body;

// //   // Find the index of the weight entry to update
// //   const index = weights.findIndex(weight => weight.id === parseInt(id));
// //   if (index !== -1) {
// //     weights[index] = { ...weights[index], ...updatedWeight };
// //     res.status(200).json(weights[index]);
// //   } else {
// //     res.status(404).json({ message: 'Weight entry not found' });
// //   }
// // });

// // // Endpoint to Add Weight Entries
// // Endpoint to Add Weight Entries



// // // Endpoint to Retrieve Weight Entries
// // app.get('/weights', (req, res) => {
// //     const query = 'SELECT destination_city, state_code, region FROM weights';
  
// //     db.query(query, (err, results) => {
// //       if (err) {
// //         console.error('Error fetching weight entries from MySQL:', err);
// //         return res.status(500).send('Error fetching weight entries');
// //       }
// //       res.json(results);
// //     });
// //   });
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const headerNames = {
    waybill_no: ['Waybill Number', 'AWB No', 'Waybill_No'],
    order_id: ['Order #', 'From', 'Order_ID'],
    destination_city: ['destination_city', 'Curr. Dest. HUB', 'Dest City'],
    order_date: ['Order Date', 'Date', 'Date'],
    weight: ['Weight', 'Wgt', 'Weight_kg']
  };
  
  // Function to get the index of the first matching header
  const getHeaderIndex = (headers, fieldNames) => {
    for (const name of fieldNames) {
      const index = headers.indexOf(name);
      if (index !== -1) return index;
    }
    return -1; // Return -1 if no matching header is found
  };
  
  // Endpoint to Upload Excel/CSV File
  app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).send('No file uploaded');
    }
  
    let data = [];
  
    try {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        // Parse CSV file
        const csv = file.buffer.toString();
        const rows = csv.split('\n').filter(row => row.trim() !== '');
        const headers = rows[0].split(',').map(header => header.trim());
  
        const weightIndex = getHeaderIndex(headers, headerNames.weight);
        const weightHeader = weightIndex !== -1 ? headers[weightIndex] : '';
  
        data = rows.slice(1).map(row => {
          const values = row.split(',').map(value => value.trim());
          const weightValue = weightIndex !== -1 ? parseFloat(values[weightIndex]) : 0;
  
          return {
            waybill_no: values[getHeaderIndex(headers, headerNames.waybill_no)] || null,
            order_id: values[getHeaderIndex(headers, headerNames.order_id)] || '',
            destination_city: values[getHeaderIndex(headers, headerNames.destination_city)] || '',
            order_date: new Date(values[getHeaderIndex(headers, headerNames.order_date)]) || null,
            weight: weightHeader === 'Wgt' ? weightValue * 1000 : weightValue // Convert kg to grams if header is 'Weight_kg'
          };
        });
      } else {
        // Parse Excel file
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet, { raw: false });
  
        const weightHeader = headerNames.weight.find(name => name in jsonData[0]) || '';
        data = jsonData.map((row) => {
          const weightValue = weightHeader ? parseFloat(row[weightHeader]) : 0;
  
          return {
            waybill_no: row[headerNames.waybill_no.find(name => name in row)] || null,
            order_id: row[headerNames.order_id.find(name => name in row)] || '',
            destination_city: row[headerNames.destination_city.find(name => name in row)] || '',
            order_date: new Date(row[headerNames.order_date.find(name => name in row)] || '') || null,
            weight: weightHeader === 'Wgt' ? weightValue * 1000 : weightValue // Convert kg to grams if column is 'Weight_kg'
          };
        });
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      return res.status(400).send('Error parsing file');
    }
  
let rates = {
  'Tamil Nadu & Pondicherry': { amount250: 30, amount1000: 40, additional500: 20 },
  'Kerala & Karnataka': { amount250: 60, amount1000: 70, additional500: 40 },
  'Andhra Pradesh & Telangana': { amount250: 70, amount1000: 90, additional500: 50 },
  'North': { amount250: 90, amount1000: 120, additional500: 70 },
  'West': { amount250: 80, amount1000: 120, additional500: 70 },
  'East': { amount250: 120, amount1000: 130, additional500: 80 },
  'North East': { amount250: 130, amount1000: 140, additional500: 90 },
  'Special Location': { amount250: 150, amount1000: 180, additional500: 110 },
  'Coimbatore and Local': { amount250: 25, amount1000: 35, additional500: 20 }
};

// Endpoint to Get Current Rates
app.get('/rates', (req, res) => {
  res.json(rates);
});

// Endpoint to Update Rates
app.put('/rates', (req, res) => {
  rates = req.body; // Update rates in-memory
  res.send('Rates updated successfully');
});

// Function to calculate amount based on weight and region
const calculateAmount = (weight, region) => {
  const { amount250, amount1000, additional500 } = rates[region] || rates['Tamil Nadu & Pondicherry'];
  let totalAmount = 0;

  if (weight <= 250) {
    totalAmount = amount250;
  } else if (weight <= 1000) {
    totalAmount = amount1000;
  } else if (weight <= 1500) {
    totalAmount = amount1000 + additional500;
  } else {
    const weightStr = weight.toString().padStart(6, '0');
    const lastThree = parseInt(weightStr.slice(-3), 10);
    const remaining = parseInt(weightStr.slice(0, -3), 10) || 0;

    if (lastThree === 0) {
      totalAmount = remaining * amount1000;
    } else if (lastThree <= 500) {
      totalAmount = (remaining * amount1000) + additional500;
    } else {
      totalAmount = (remaining + 1) * amount1000;
    }
  }

  return totalAmount;
};

// Endpoint to Upload Excel/CSV File


  db.query('SELECT destination_city, state_code, region FROM weights', (err, weightResults) => {
    if (err) {
      console.error('Error fetching weights data:', err);
      return res.status(500).send('Error fetching weights data');
    }

    const weightMap = weightResults.reduce((acc, row) => {
      acc[row.destination_city] = {
        state_code: row.state_code,
        region: row.region
      };
      return acc;
    }, {});

    // Calculate Amount and prepare data for insertion
    const processedData = data.map(item => {
      const weightInfo = weightMap[item.destination_city] || {};
      const amount = calculateAmount(item.weight, weightInfo.region || 'Tamil Nadu & Pondicherry');

      return {
        ...item,
        amount,
        destination_city: weightInfo.state_code ? `${item.destination_city} ${weightInfo.state_code}` : item.destination_city
      };
    });

    // Delete existing data from waybills table
    db.query('DELETE FROM waybills', (err) => {
      if (err) {
        console.error('Error deleting old data from waybills:', err);
        return res.status(500).send('Error deleting old data from waybills');
      }

      // Insert new data into MySQL
      const query = 'INSERT INTO waybills (waybill_no, order_id, destination_city, order_date, weight, amount) VALUES ?';
      const values = processedData.map(item => [
        item.waybill_no,
        item.order_id,
        item.destination_city,
        item.order_date,
        item.weight,
        item.amount
      ]);

      db.query(query, [values], (err) => {
        if (err) {
          console.error('Error inserting data into MySQL:', err);
          return res.status(500).send('Error inserting data into database');
        }
        console.log('Data inserted successfully');
        res.json(processedData);
      });
    });
  });
});

// Endpoint to Retrieve Data from MySQL
app.get('/waybills', (req, res) => {
  const query = 'SELECT waybill_no, order_id, destination_city, order_date, weight, amount FROM waybills';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data from MySQL:', err);
      return res.status(500).send('Error fetching data from database');
    }
    res.json(results);
  });
});

// Endpoint to Edit a Record
app.put('/waybills/:waybill_no', (req, res) => {
  const { waybill_no } = req.params;
  const { order_id, destination_city, order_date, weight, amount } = req.body;

  const query = 
    `UPDATE waybills
    SET order_id = ?, destination_city = ?, order_date = ?, weight = ?, amount = ?
    WHERE waybill_no = ?`
  ;
  
  db.query(query, [order_id, destination_city, new Date(order_date), weight, amount, waybill_no], (err) => {
    if (err) {
      console.error('Error updating record:', err);
      return res.status(500).json({ error: 'Error updating record' });
    }
    res.json({ message: 'Record updated successfully' });
  });
});

// Endpoint to Delete a Record
app.delete('/waybills/:waybill_no', (req, res) => {
  const { waybill_no } = req.params;

  const query = 'DELETE FROM waybills WHERE waybill_no = ?';

  db.query(query, [waybill_no], (err) => {
    if (err) {
      console.error('Error deleting record:', err);
      return res.status(500).json({ error: 'Error deleting record' });
    }
    res.json({ message: 'Record deleted successfully' });
  });
});
app.get('/weights', (req, res) => {
  const query = 'SELECT * FROM weights';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching weights:', err);
      return res.status(500).send('Error fetching weights');
    }
    res.json(results);
  });
});



app.post('/weights', (req, res) => {
  const { destination_city, state_code, region } = req.body;
  const query = 'INSERT INTO weights (destination_city, state_code, region) VALUES (?, ?, ?)';
  db.query(query, [destination_city, state_code, region], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).send('Server Error');
    }
    res.status(201).send(result);
  });
});

app.put('/weights/:id', (req, res) => {
  const { id } = req.params;
  const { destination_city, state_code, region } = req.body;
  const query = 'UPDATE weights SET destination_city = ?, state_code = ?, region = ? WHERE id = ?';
  db.query(query, [destination_city, state_code, region, id], (err, result) => {
    if (err) {
      console.error('Error updating data:', err);
      return res.status(500).send('Server Error');
    }
    res.status(200).send(result);
  });
});


app.delete('/weights/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM weights WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) {
      console.error('Error deleting weight entry:', err);
      return res.status(500).send('Error deleting weight entry');
    }
    res.send('Weight entry deleted successfully');
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


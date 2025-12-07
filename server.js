const express = require('express');
const bodyParser = require('body-parser');
const js2xmlparser = require('js2xmlparser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json()); // parse JSON
app.use(bodyParser.text({ type: 'application/xml' })); // parse XML

// In-memory data (temporary database)
let resources = [];
let nextId = 1;

// Helper function to send JSON or XML depending on Accept header
function sendResponse(req, res, data) {
    if (req.headers.accept === 'application/xml') {
        res.set('Content-Type', 'application/xml');
        res.send(js2xmlparser.parse("response", data));
    } else {
        res.json(data);
    }
}

// ======================
// RESTful API Endpoints
// ======================

// 1. GET /resource → list all resources
app.get('/resource', (req, res) => {
    sendResponse(req, res, resources);
});

// 2. POST /resource → add a new resource
app.post('/resource', (req, res) => {
    let data = req.body;

    // If request is XML, parse it
    if (req.is('application/xml')) {
        const xml2js = require('xml2js');
        xml2js.parseString(req.body, (err, result) => {
            if (err) return res.status(400).send("Invalid XML");
            data = result.resource;
            createResource(data, res);
        });
    } else {
        createResource(data, res);
    }
});

// Function to create resource
function createResource(data, res) {
    const resource = {
        id: nextId++,
        name: data.name,
        description: data.description,
        quantity: Number(data.quantity),
        price: Number(data.price)
    };
    resources.push(resource);
    sendResponse({ headers: { accept: 'application/json' } }, res, resource);
}

// 3. GET /resource/:id → get a specific resource by ID
app.get('/resource/:id', (req, res) => {
    const resource = resources.find(r => r.id == req.params.id);
    if (!resource) return res.status(404).send("Resource not found");
    sendResponse(req, res, resource);
});

// 4. PUT /resource/:id → update a specific resource
app.put('/resource/:id', (req, res) => {
    const resource = resources.find(r => r.id == req.params.id);
    if (!resource) return res.status(404).send("Resource not found");

    const data = req.body;
    resource.name = data.name || resource.name;
    resource.description = data.description || resource.description;
    resource.quantity = data.quantity !== undefined ? Number(data.quantity) : resource.quantity;
    resource.price = data.price !== undefined ? Number(data.price) : resource.price;

    sendResponse(req, res, resource);
});

// 5. DELETE /resource/:id → delete a specific resource
app.delete('/resource/:id', (req, res) => {
    resources = resources.filter(r => r.id != req.params.id);
    sendResponse(req, res, { message: `Resource ${req.params.id} deleted successfully.` });
});

// Start server
const PORT = process.env.PORT || 3000; // <- use this instead of 3000 only
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
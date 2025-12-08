const express = require('express'); 
const bodyParser = require('body-parser'); 
const js2xmlparser = require('js2xmlparser'); 
const cors = require('cors'); 
const xml2js = require('xml2js'); 
 
const app = express(); 
app.use(cors()); 
app.use(bodyParser.json()); // parse JSON 
app.use(bodyParser.text({ type: 'application/xml' })); // parse XML 
 
// In-memory data (temporary database) 
// IMPORTANT: This 'resources' array will reset with each serverless function invocation. 
// For persistent data, you need an external database (e.g., Supabase as mentioned in your memory). 
let resources = []; 
let nextId = 1; 
 
// Helper function to send JSON or XML depending on Accept header 
function sendResponse(req, res, data) { 
    if (req.headers.accept === 'application/xml') { 
        res.set('Content-Type', 'application/xml'); 
        // Ensure the root element for XML is consistent, e.g., "resources" for arrays 
        if (Array.isArray(data)) { 
            res.send(js2xmlparser.parse("resources", data)); // Changed root to "resources" for arrays 
        } else { 
            res.send(js2xmlparser.parse("resource", data)); // Changed root to "resource" for single items 
        } 
    } else { 
        res.json(data); 
    } 
} 
 
// Helper function to parse XML body 
async function parseXmlBody(body) { 
    return new Promise((resolve, reject) => { 
        xml2js.parseString(body, { explicitArray: false }, (err, result) => { 
            if (err) reject(err); 
            // Ensure we're targeting the correct root element from the XML request body 
            else resolve(result.resource); // Assumes request XML body has a <resource> root 
        }); 
    }); 
} 
 
// ====================== 
// RESTful API Endpoints 
// ====================== 
 
// 1. GET /resource → list all resources 
app.get('/resource', (req, res) => { 
    sendResponse(req, res, resources); 
}); 
 
// 2. POST /resource → add a new resource 
app.post('/resource', async (req, res) => { 
    let data = req.body; 
 
    try { 
        if (req.is('application/xml')) { 
            data = await parseXmlBody(req.body); 
        } 
 
        const resource = { 
            id: nextId++, 
            name: data.name, 
            description: data.description, 
            quantity: Number(data.quantity), 
            price: Number(data.price) 
        }; 
 
        resources.push(resource); 
        sendResponse(req, res, resource); 
    } catch (err) { 
        res.status(400).send("Invalid XML or missing resource data"); 
    } 
}); 
 
// 3. GET /resource/:id → get a specific resource by ID 
app.get('/resource/:id', (req, res) => { 
    const resource = resources.find(r => r.id == req.params.id); 
    if (!resource) return res.status(404).send("Resource not found"); 
    sendResponse(req, res, resource); 
}); 
 
// 4. PUT /resource/:id → update a specific resource 
app.put('/resource/:id', async (req, res) => { 
    const resource = resources.find(r => r.id == req.params.id); 
    if (!resource) return res.status(404).send("Resource not found"); 
 
    let data = req.body; 
    try { 
        if (req.is('application/xml')) { 
            data = await parseXmlBody(req.body); 
        } 
 
        resource.name = data.name || resource.name; 
        resource.description = data.description || resource.description; 
        resource.quantity = data.quantity !== undefined ? Number(data.quantity) : resource.quantity; 
        resource.price = data.price !== undefined ? Number(data.price) : resource.price; 
 
        sendResponse(req, res, resource); 
    } catch (err) { 
        res.status(400).send("Invalid XML or missing resource data"); 
    } 
}); 
 
// 5. DELETE /resource/:id → delete a specific resource 
app.delete('/resource/:id', (req, res) => { 
    const resourceIndex = resources.findIndex(r => r.id == req.params.id); 
    if (resourceIndex === -1) return res.status(404).send("Resource not found"); 
 
    resources.splice(resourceIndex, 1); 
    sendResponse(req, res, { message: `Resource ${req.params.id} deleted successfully.` }); 
}); 
 
// This is the crucial line for Vercel serverless functions 
module.exports = app;
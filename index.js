const express = require('express')
const app = express()
// const port = process.env.PORT || 5000;
const port = 5000;
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken')

// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kahzgwg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const componentsCollection = client.db("techshop").collection('components');
    const cartCollection = client.db("techshop").collection('cart');
    const usersCollection = client.db("techshop").collection('users');


    //-------------------------------TOKEN----------------------------
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })

    //----------------------------MIDDLEWARE------------------------
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    //--------------------component--------------------------
    app.get('/components', async (req, res) => {
      const result = await componentsCollection.find().toArray();
      res.send(result)
    })

    app.post('/components', verifyToken, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await componentsCollection.insertOne(product)
      res.send(result)
    })

    app.get('/components/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await componentsCollection.findOne(query);
      res.send(result)
    })

    app.patch('/components/:id', async(req, res) => {
      const product = req.body;
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          name: product.name,
          price: product.price,
          category: product.category,
          brand: product.brand,
          stock: product.stock,
          imageUrl: product.imageUrl,
          description: product.description,
        }
      }
      const result = await componentsCollection.updateOne(query, updatedDoc)
      res.send(result)
    })

    app.delete('/components/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await componentsCollection.deleteOne(query);
      res.send(result)
    })

    // users---------------------------
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    //make admin
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //check if admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      // console.log(admin)
      res.send({ admin })

    })

    // cart---------------------------------
    app.get('/cart', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    // cart items
    app.post('/cart', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('server running')
})

app.listen(port, () => {
  console.log('listtttening', { port })
})
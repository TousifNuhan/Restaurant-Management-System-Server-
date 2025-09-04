const express = require('express')
const app = express()
const cors = require('cors')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l6latif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const userCollectetion = client.db('RestaurantDB').collection('users')
    const menuCollectetion = client.db('RestaurantDB').collection('menu')
    const reviewsCollectetion = client.db('RestaurantDB').collection('reviews')
    const cartCollectetion = client.db('RestaurantDB').collection('carts')
    const paymentCollectetion = client.db('RestaurantDB').collection('payments')
    const employyeCollection = client.db("RestaurantDB").collection("employeeDetails")

    // create token
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(
        user,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
      )
      res.send({ token })
    })

    // middleware : verify Token

    const verifyToken = (req, res, next) => {
      // console.log(req.headers)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized Access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // middleware : verify admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollectetion.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'Unauthorized Access' })
      }
      next()
    }

    // user api

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollectetion.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (!email === req.decoded) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      const query = { email: email }
      const user = await userCollectetion.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    app.post('/users', async (req, res) => {
      const data = req.body
      const query = { email: data.email }
      const existingUser = await userCollectetion.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User is already in your DB' })
      }
      const result = await userCollectetion.insertOne(data)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {

      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollectetion.deleteOne(query)
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await userCollectetion.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //add employee

    app.get('/addEmployee/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await employyeCollection.findOne(query)
      res.send(result)
    })

    app.get('/addEmployee', async (req, res) => {
      const result = await employyeCollection.find().toArray()
      res.send(result)
    })

    app.post('/addEmployee', async (req, res) => {
      const datas = req.body
      const result = await employyeCollection.insertOne(datas)
      res.send(result)
    })

    app.delete('/addEmployee/:id', verifyToken, verifyAdmin, async (req, res) => {
      id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await employyeCollection.deleteOne(query)
      res.send(result)

    })

    app.patch('/addEmployee/:id', async (req, res) => {
      const doc = req.body
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          name: doc?.name,
          Department: doc?.Department,
          Employee_details: doc?.Employee_details,
          Phone: doc?.Phone,
          PhotoURL: doc?.PhotoURL,
          Role: doc?.Role,
          Salary: doc?.Salary,
          Shift: doc?.Shift,
        }
      }
      const result=await employyeCollection.updateOne(query,updatedDoc,options)
      res.send(result)
    })


    // menu related apis

    app.get('/menus', verifyToken, async (req, res) => {
      const idsParam = req.query.ids
      const ids = idsParam.split(',');
      console.log(idsParam)
      const query = { _id: { $in: ids } }
      const result = await menuCollectetion.find(query).toArray()
      res.send(result)
    })

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id)
      const query = { _id: id }
      const result = await menuCollectetion.findOne(query)
      // console.log(result)
      res.send(result)
    })

    app.get('/menu', async (req, res) => {
      const result = await menuCollectetion.find().toArray()
      res.send(result)
    })

    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body
      const result = await menuCollectetion.insertOne(item)
      res.send(result)
    })

    app.delete('/menu/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollectetion.deleteOne(query)
      res.send(result)
    })

    app.patch('/menu/:id', async (req, res) => {
      const doc = req.body
      const id = req.params.id
      const query = { _id: id }
      const updatedDoc = {
        $set: {
          name: doc.name,
          category: doc.category,
          price: doc.price,
          recipe: doc.recipe,
          image: doc.image,
        }
      }
      // console.log(updatedDoc)
      const result = await menuCollectetion.updateOne(query, updatedDoc)
      // console.log(result)
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollectetion.find().toArray()
      res.send(result)
    })

    //carts
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartCollectetion.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const user = req.body
      const result = await cartCollectetion.insertOne(user)
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollectetion.deleteOne(query)
      res.send(result)

    })

    //PAYMENT INTENT
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        client_secret: paymentIntent.client_secret
      })
    })

    // payments

    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await paymentCollectetion.find(query).toArray()
      res.send(result)
    })

    app.get('/invoice/:transactionID', verifyToken, async (req, res) => {
      const trID = req.params.transactionID
      // console.log(trID)
      const query = { transactionID: trID }
      const result = await paymentCollectetion.findOne(query)
      if (!result) {
        res.status(401).send({ message: 'not found' })
      }
      // console.log(result)
      res.send(result)

      // const result=await paymentCollectetion.find().toArray()
      // res.send(result)
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body
      // console.log(payment)
      const result = await paymentCollectetion.insertOne(payment)

      // delete the item from the card
      const query = {
        _id: {
          $in: payment.cardIDs.map(id => new ObjectId(id))

        }
      }
      const deleteResult = await cartCollectetion.deleteMany(query)

      res.send({ result, deleteResult })
    })

    //admin-stats

    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollectetion.estimatedDocumentCount()
      const products = await menuCollectetion.estimatedDocumentCount()
      const orders = await paymentCollectetion.estimatedDocumentCount()

      // shortcut way because aita krle barbar sob data call kor shekhan thke fetch krte hoy
      // const payments = await paymentCollectetion.find().toArray()
      // const revenue = payments.reduce((total, item) => total + item.price,0)


      const revenueResult = await paymentCollectetion.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$price" }
          }
        }
      ]).toArray()

      const revenue = revenueResult[0]?.totalRevenue || 0

      res.send({
        users, products, orders, revenue
      })
    })

    // aggregation pipeline

    app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
      const ress = await paymentCollectetion.aggregate([
        {
          $unwind: "$menuItemIDs"
        },
        {
          $lookup: {
            from: "menu",
            localField: "menuItemIDs",
            foreignField: "_id",
            as: "menuItems"
          }
        },
        {
          $unwind: "$menuItems"
        },
        {
          $group: {
            _id: "$menuItems.category",
            quantity: { $sum: 1 },
            revenue: { $sum: "$menuItems.price" }
          }
        },
        // it wont show the id
        {
          $project: {
            _id: 0,
            category: "$_id",
            quantity: "$quantity",
            revenue: "$revenue"
          }
        }
      ]).toArray()
      res.send(ress)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
  res.send('boss')
})

app.listen(port, () => {
  console.log("runung")
})
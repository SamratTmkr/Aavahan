import { Router } from "express";

const subscriptionRouter = Router();


subscriptionRouter.get('/', (req, res) => {
    res.send({
        title: 'GET all subscriptions'
    })
})

subscriptionRouter.get('/:id', (req, res) => {
    res.send({
        title: 'GET subscription by id'
    })
})

subscriptionRouter.post('/', (req, res) => {
    res.send({
        title: 'CREATE subscription by id'
    })
})

subscriptionRouter.put('/:id', (req, res) => {
    res.send({
        title: 'UPDATE subscription by id'
    })
})

subscriptionRouter.delete('/:id', (req, res) => {
    res.send({
        title: 'DELETE subscription by id'
    })
})

subscriptionRouter.get('/user/:id', (req, res) => res.send({
    title: 'GET subscription  by user id'
}))

subscriptionRouter.put('/:id/cancel', (req, res) => res.send({
    title: 'CANCEL subscription'
}))

subscriptionRouter.get('/upcoming-renewals', (req, res) => res.send({ title: 'GET upcoming renewal' }))
export default subscriptionRouter;
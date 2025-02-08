const { response, request } = require('express');
const { dbConnect } = require('../../config/db/connection');
const { handleHttpError } = require('../../utils/handleError');
const { getCompras, getCompra, postCompra, putCompra, deleteCompra, detalleCompra } = require('./feature');

async function getComprasCtrl(req, res) {
    try {
        let compras = await getCompras(req);
        return res.status(200).json({ compras });
    } catch (error) {
        return handleHttpError(res, error);
        //return res.status(error.codigo || 500).send({ message: `${error.message || error}` });
    }
}

async function getCompraCtrl(req, res) {
    try {
        console.log(req.params)
        const { id } = req.params;
        let compra = await detalleCompra(id);
        return res.status(200).json({ compra });
    } catch (error) {
        return handleHttpError(res, error);
    }
}

async function postCompraCtrl(req, res) {
    let transaction = await dbConnect.transaction();
    try {
        let compra = await postCompra(req, transaction);
        transaction.commit();
        return res.status(201).json({ msg: 'Compra creada correctamente', compra });
    } catch (error) {
        transaction.rollback();
        return handleHttpError(res, error);
    }
}

async function putCompraCtrl(req, res) {
    let transaction = await dbConnect.transaction();
    try {
        let compra = await putCompra(req, transaction);
        transaction.commit();
        return res.status(200).json({ msg: 'Transaccion correcta', compra });
    } catch (error) {
        transaction.rollback();
        return handleHttpError(res, error);
    }
}

async function deleteCompraCtrl(req, res) {
    let transaction = await dbConnect.transaction();
    try {
        let compra = await deleteCompra(req, transaction);
        transaction.commit();
        return res.status(200).json({ msg: 'Compra eliminada correctamente', compra });
    } catch (error) {
        transaction.rollback();
        return handleHttpError(res, error);
    }
}

module.exports = { getComprasCtrl, getCompraCtrl, postCompraCtrl, putCompraCtrl, deleteCompraCtrl };

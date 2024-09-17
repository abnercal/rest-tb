const express = require("express");
const cors = require('cors');
const {dbConnnectonMySql} = require("./db/connection");
const db = require("../models/mysql");
//cors permite proteger el servidor
class Server {
    constructor() {
        this.app = express(); 
        this.port = process.env.PORT || 3000;
        this.paths = {
            auth: '/api/auth',
            usuarios: '/api/usuarios',
            categorias: '/api/categorias',
            marcas: '/api/marcas',
            presentaciones: '/api/presentaciones',
            productos: '/api/productos',
            proveedor: '/api/proveedor',
            compras: '/api/compras',
            ordenes: '/api/ordenes',
        }

        //Conectar a base de datos
        //dbConnnectonMySql()
        this.conectarDB

        //Middlewares
        this.middlewares()

        //Rutas de mi aplicacion
        this.routes()
    }

    async conectarDB() {
        await dbConnnectonMySql();
    }

    middlewares() {
        //cors
        this.app.use( cors() )

        //Parseo y lectura del body
        this.app.use( express.json() )

        //Direccion publica
        this.app.use( express.static('public') )
    }

    routes() {
        this.app.use(this.paths.usuarios, require('../routes/usuarios'))
        this.app.use(this.paths.categorias, require('../routes/categorias'))
        this.app.use(this.paths.marcas, require('../routes/marcas'))
        this.app.use(this.paths.presentaciones, require('../routes/presentaciones'))
        this.app.use(this.paths.productos, require('../routes/productos'))
        this.app.use(this.paths.proveedor, require('../routes/proveedores'))
        this.app.use(this.paths.compras, require('../routes/compras'))
        this.app.use(this.paths.ordenes, require('../routes/ordenes'))
        this.app.use('*',(req,res) => {
            res.status(404).json({
                errors: {
                    msg:'URL_NOT_FOUND'
                }
            })
        })
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log(`Server Backend Up run http://localhost:${this.port}`);
          });        
    }
}

module.exports = Server
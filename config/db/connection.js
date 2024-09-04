const { Sequelize } = require('sequelize');

const database = process.env.MYSQL_DATABASE;
const user = process.env.MYSQL_USER;
const pass = process.env.MYSQL_PASSWORD;
const host = process.env.MYSQL_HOST;

const dbConnect = new Sequelize(database, user, pass, {
  host,
  dialect: 'mysql',
});

const dbConnnectonMySql = async () => {
  try {
    await  dbConnect.authenticate();
    console.log('Conexion DB Correcta.');
  } catch (error) {
      console.error('Error de conexion a DB:', error);
      process.exit(1);
  }
}

module.exports = { dbConnect, dbConnnectonMySql }
const express = require("express");
const router = express.Router();
const productosController = require("./productos.controller");
const { verificarToken } = require("../middleware/auth");

const {
  validarCamposRequeridos,
  validarNumero,
} = require("../middleware/validator");
router.get("/menu", productosController.obtenerMenu);
router.get("/stock-bajo", productosController.obtenerStockBajo);
router.get("/:id", productosController.obtenerPorId);
router.get("/", productosController.obtenerTodos);

router.post(
  "/",
  verificarToken,
  validarCamposRequeridos(["nombre", "precio", "categoria_id", "destino_id"]),
  validarNumero("precio", { min: 0.01 }),
  productosController.crear
);

router.put("/:id", verificarToken, productosController.actualizar);
router.patch("/:id/stock", verificarToken, productosController.actualizarStock);
router.delete("/:id", verificarToken, productosController.eliminar);
module.exports = router;

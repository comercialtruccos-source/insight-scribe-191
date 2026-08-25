# Insight Hub

necesito crear una plaaforma de Business inteligence para mi empresa, debe ser una plataforma que me perimita subir un archivo historico de ventas con estas columnas Transaccion	Año	Mes	DIA	Vendedor	TerceroAux	Tercero	Zona	Ciudad	Linea	Colección	ProductoC	PrendaHGI	Producto	TallaP	Color	Cantidad	Valor	Cod Color	SKU	AÑO COL	VENDEDOR2	CANAL	ZONA2	PAIS	ZONA COLOMBIA	FECHA COMPRA	CORRERIA	MARCA	TR	COSTO	COSTO TOTAL, algunas columnas deben de ser como tablas de bases de datos para poder hacer las dimensiones de tiempo,region, vendedores y demás, estas son las columnas especificas que se consultan desde las otras tablas que serian como base de datos CANAL	ZONA2	PAIS	ZONA COLOMBIA	FECHA COMPRA	CORRERIA	MARCA	TR	COSTO	COSTO TOTAL, crea primero el sistema para la carga del archivo, y cada vez que se suba el archivo, debe actualizar solo los datos nuevos, por lo cual la primera carga es la base inicial y desde esa, ir actualizando los dias, meses y años siguientes

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://insight-scribe-191.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ebe2e2df-b77f-40c2-a0b9-e329e62fe1b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

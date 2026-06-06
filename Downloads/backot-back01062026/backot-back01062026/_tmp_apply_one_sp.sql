IF OBJECT_ID(N'[dbo].[traertodoslosproductos_x_idrutaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[traertodoslosproductos_x_idrutaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[TraerTodosLosProductos_x_IdRutaWeb](@Id_Ruta int)
as
select pr.* 
from tbl_saldotarjetas s inner join tbl_producto pr on pr.id_producto=s.id_producto
where s.id_ruta=@Id_Ruta and s.e_eliminado=0 and s.cantidad>0 
order by Nombre Asc
GO

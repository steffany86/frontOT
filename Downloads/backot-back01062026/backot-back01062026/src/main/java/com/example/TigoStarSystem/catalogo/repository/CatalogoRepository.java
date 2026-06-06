package com.example.TigoStarSystem.catalogo.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Repository;

import java.sql.CallableStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Repository
public class CatalogoRepository {
    private static final Logger logger = LoggerFactory.getLogger(CatalogoRepository.class);
    private final JdbcTemplate jdbcTemplate;
    private final CatalogoDbSupport dbSupport;

    public CatalogoRepository(
            JdbcTemplate jdbcTemplate,
            SucursalRepository sucursalRepository,
            @Value("${spring.datasource.driver-class-name}") String dbDriver,
            @Value("${spring.datasource.url}") String mainDatasourceUrl,
            @Value("${app.sucre.datasource.url:}") String sucreDatasourceUrl,
            @Value("${auth.login.sucre.database:SucrePrueba}") String sucreDatabase,
            @Value("${app.sucre.datasource.username:${spring.datasource.username}}") String sucreUsername,
            @Value("${app.sucre.datasource.password:${spring.datasource.password}}") String sucrePassword,
            @Value("${app.datasource.params:encrypt=false;trustServerCertificate=true}") String dbParams) {
        this.jdbcTemplate = jdbcTemplate;
        this.dbSupport = new CatalogoDbSupport(
                sucursalRepository,
                dbDriver,
                mainDatasourceUrl,
                sucreDatasourceUrl,
                sucreDatabase,
                sucreUsername,
                sucrePassword,
                dbParams
        );
    }

    public List<Map<String, Object>> listarTecnicos() {
        return listarTecnicos(null);
    }

    public List<Map<String, Object>> listarTecnicos(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_ObtenerTecnicosEnRuta");
    }

    public List<Map<String, Object>> listarRutasPorTecnico(Integer idTecnico) {
        return listarRutasPorTecnico(idTecnico, null);
    }

    public List<Map<String, Object>> listarRutasPorTecnico(Integer idTecnico, Integer idSucursal) {
        JdbcTemplate target = template(idSucursal);
        Integer tecnico = idTecnico != null && idTecnico > 0 ? idTecnico : null;

        if (tecnico != null) {
            // Flujo requerido:
            // 1) obtener id_vendedor en tbl_usuariotecnico por id_usuario
            // 2) buscar rutas activas en tbl_ruta por id_vendedor (e_eliminado = 0)
            List<Integer> vendedores = listarVendedoresPorUsuario(target, tecnico);
            if (!vendedores.isEmpty()) {
                List<Map<String, Object>> rutasPorVendedor = new ArrayList<>();
                for (Integer idVendedor : vendedores) {
                    rutasPorVendedor.addAll(listarRutasActivasPorVendedor(target, idVendedor));
                }
                List<Map<String, Object>> filtradas = filtrarRutasNoEliminadas(rutasPorVendedor);
                if (!filtradas.isEmpty()) {
                    return filtradas;
                }
            }

            // Compatibilidad: en algunas instalaciones el id recibido puede corresponder directamente al vendedor.
            List<Map<String, Object>> vendedorRows = listarRutasActivasPorVendedor(target, tecnico);
            if (!vendedorRows.isEmpty()) {
                return vendedorRows;
            }
            try {
                return filtrarRutasNoEliminadas(target.queryForList("EXEC spx_ObtenerRutaXIdTecnico ?", tecnico));
            } catch (DataAccessException ex) {
                return new ArrayList<>();
            }
        }

        List<Map<String, Object>> activeRows = listarRutasActivas(target);
        if (!activeRows.isEmpty()) {
            return activeRows;
        }

        try {
            return filtrarRutasNoEliminadas(target.queryForList("EXEC spx_ObtenerRutaXIdTecnico ?", (Object) null));
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> listarRutasActivasPorUsuario(JdbcTemplate target, Integer idUsuario) {
        String[] statements = new String[] {
                "SELECT DISTINCT " +
                        "r.id_ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.id_ruta) AS ruta, " +
                        "r.id_vendedor AS id_vendedor, " +
                        "ISNULL(r.e_eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_ruta r " +
                        "INNER JOIN dbo.tbl_usuariotecnico ut ON ut.id_vendedor = r.id_vendedor " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ?) " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ISNULL(r.e_eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.id_ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.id_ruta) AS ruta, " +
                        "r.id_tecnico AS id_tecnico, " +
                        "ISNULL(r.e_eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_ruta r " +
                        "INNER JOIN dbo.tbl_usuariotecnico ut ON ut.id_vendedor = r.id_tecnico " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ?) " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ISNULL(r.e_eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.Id_Ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.Id_Ruta) AS ruta, " +
                        "r.Id_Vendedor AS id_vendedor, " +
                        "ISNULL(r.E_Eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_Ruta r " +
                        "INNER JOIN dbo.tbl_UsuarioTecnico ut ON ut.Id_Vendedor = r.Id_Vendedor " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ?) " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ISNULL(r.E_Eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.Id_Ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.Id_Ruta) AS ruta, " +
                        "r.Id_Tecnico AS id_tecnico, " +
                        "ISNULL(r.E_Eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_Ruta r " +
                        "INNER JOIN dbo.tbl_UsuarioTecnico ut ON ut.Id_Vendedor = r.Id_Tecnico " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ?) " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ISNULL(r.E_Eliminado, 0) = 0 " +
                        "ORDER BY 2"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql, idUsuario, idUsuario);
                List<Map<String, Object>> filtered = filtrarRutasNoEliminadas(rows);
                if (!filtered.isEmpty()) {
                    return filtered;
                }
            } catch (DataAccessException ex) {
                // probar siguiente variante
            }
        }
        return new ArrayList<>();
    }

    private List<Integer> listarVendedoresPorUsuario(JdbcTemplate target, Integer idUsuario) {
        String[] statements = new String[] {
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_tecnico = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idtecnico = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_tecnico = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idtecnico = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Usuario = ? " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdUsuario = ? " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Tecnico = ? " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdTecnico = ? " +
                        "AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Usuario = ? " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdUsuario = ? " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Tecnico = ? " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdTecnico = ? " +
                        "AND ut.Id_Vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_tecnico = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idtecnico = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_tecnico = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idtecnico = ? " +
                        "AND ut.id_vendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? " +
                        "AND ut.idvendedor IS NOT NULL " +
                        "ORDER BY 1"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql, idUsuario);
                List<Integer> vendedores = extraerIdsVendedor(rows);
                if (!vendedores.isEmpty()) {
                    return vendedores;
                }
            } catch (DataAccessException ex) {
                // probar siguiente variante de esquema
            }
        }
        return new ArrayList<>();
    }

    private List<Integer> extraerIdsVendedor(List<Map<String, Object>> rows) {
        LinkedHashSet<Integer> ids = new LinkedHashSet<>();
        if (rows == null || rows.isEmpty()) {
            return new ArrayList<>();
        }
        for (Map<String, Object> row : rows) {
            if (row == null || row.isEmpty()) {
                continue;
            }
            Object raw = row.get("id_vendedor");
            if (raw == null) raw = row.get("Id_Vendedor");
            if (raw == null) raw = row.get("idvendedor");
            Integer id = tryParseInteger(raw);
            if (id != null && id > 0) {
                ids.add(id);
            }
        }
        return new ArrayList<>(ids);
    }

    private Integer tryParseInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) return null;
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<Map<String, Object>> listarRutasActivasPorVendedor(JdbcTemplate target, Integer idVendedorOTecnico) {
        String[] statements = new String[] {
                "SELECT DISTINCT " +
                        "r.id_ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.id_ruta) AS ruta, " +
                        "r.id_vendedor AS id_vendedor, " +
                        "ISNULL(r.e_eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_ruta r " +
                        "WHERE r.id_vendedor = ? " +
                        "AND ISNULL(r.e_eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.id_ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.id_ruta) AS ruta, " +
                        "r.id_tecnico AS id_tecnico, " +
                        "ISNULL(r.e_eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_ruta r " +
                        "WHERE r.id_tecnico = ? " +
                        "AND ISNULL(r.e_eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.Id_Ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.Id_Ruta) AS ruta, " +
                        "r.Id_Vendedor AS id_vendedor, " +
                        "ISNULL(r.E_Eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_Ruta r " +
                        "WHERE r.Id_Vendedor = ? " +
                        "AND ISNULL(r.E_Eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "r.Id_Ruta AS idRuta, " +
                        "CONVERT(NVARCHAR(200), r.Id_Ruta) AS ruta, " +
                        "r.Id_Tecnico AS id_tecnico, " +
                        "ISNULL(r.E_Eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_Ruta r " +
                        "WHERE r.Id_Tecnico = ? " +
                        "AND ISNULL(r.E_Eliminado, 0) = 0 " +
                        "ORDER BY 2"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql, idVendedorOTecnico);
                List<Map<String, Object>> filtered = filtrarRutasNoEliminadas(rows);
                if (!filtered.isEmpty()) {
                    return filtered;
                }
            } catch (DataAccessException ex) {
                // probar siguiente variante
            }
        }
        return new ArrayList<>();
    }

    private List<Map<String, Object>> listarRutasActivas(JdbcTemplate target) {
        String[] statements = new String[] {
                "SELECT DISTINCT " +
                        "CAST(r.id_ruta AS INT) AS idRuta, " +
                        "CAST(r.id_ruta AS NVARCHAR(200)) AS ruta, " +
                        "CAST(r.id_vendedor AS INT) AS id_vendedor, " +
                        "ISNULL(r.e_eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_ruta r " +
                        "WHERE ISNULL(r.e_eliminado, 0) = 0 " +
                        "ORDER BY 2",
                "SELECT DISTINCT " +
                        "CAST(r.Id_Ruta AS INT) AS idRuta, " +
                        "CAST(r.Id_Ruta AS NVARCHAR(200)) AS ruta, " +
                        "CAST(r.Id_Vendedor AS INT) AS id_vendedor, " +
                        "ISNULL(r.E_Eliminado, 0) AS e_eliminado " +
                        "FROM dbo.tbl_Ruta r " +
                        "WHERE ISNULL(r.E_Eliminado, 0) = 0 " +
                        "ORDER BY 2"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql);
                List<Map<String, Object>> filtered = filtrarRutasNoEliminadas(rows);
                if (!filtered.isEmpty()) {
                    return filtered;
                }
            } catch (DataAccessException ex) {
                // probar siguiente variante
            }
        }
        return new ArrayList<>();
    }

    private List<Map<String, Object>> filtrarRutasNoEliminadas(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row == null || row.isEmpty()) {
                continue;
            }
            Object eliminado = row.get("e_eliminado");
            if (eliminado == null) eliminado = row.get("E_Eliminado");
            if (eliminado == null) eliminado = row.get("eeliminado");
            if (esEliminado(eliminado)) {
                continue;
            }
            out.add(row);
        }
        return out;
    }

    private boolean esEliminado(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean) return (Boolean) value;
        if (value instanceof Number) return ((Number) value).intValue() != 0;
        String normalized = String.valueOf(value).trim().toLowerCase();
        if (normalized.isEmpty()) return false;
        return normalized.equals("1")
                || normalized.equals("true")
                || normalized.equals("si")
                || normalized.equals("yes");
    }

    public List<Map<String, Object>> listarTiposServicio() {
        return listarTiposServicio(null);
    }

    public List<Map<String, Object>> listarTiposServicio(Integer idSucursal) {
        JdbcTemplate target = template(idSucursal);
        try {
            return target.queryForList(
                    "SELECT " +
                            "Id_TipoServicio AS idTipoServicio, " +
                            "Nombre AS tipoServicio, " +
                            "Prefijo AS prefijo, " +
                            "ISNULL(CAST(Nomencladores AS BIT), 0) AS nomencladores, " +
                            "ISNULL(CAST(habilitarTieneDetalle AS BIT), 0) AS habilitarTieneDetalle " +
                            "FROM dbo.tbl_tiposervicio " +
                            "WHERE ISNULL(E_Eliminado, 0) = 0 " +
                            "ORDER BY Nombre"
            );
        } catch (DataAccessException ex) {
            return target.queryForList("EXEC spx_ObtenerTipoServicio");
        }
    }

    public List<Map<String, Object>> listarNomencladores() {
        return listarNomencladores(null);
    }

    public List<Map<String, Object>> listarNomencladores(Integer idSucursal) {
        JdbcTemplate target = template(idSucursal);
        try {
            return target.queryForList("EXEC spx_ObtenerNomencladores");
        } catch (DataAccessException ex) {
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarEstados() {
        return listarEstados(null);
    }

    public List<Map<String, Object>> listarEstados(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC sp_ObtenerEstado");
    }

    public List<Map<String, Object>> listarRamales(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_ObtenerRamal");
    }

    public List<Map<String, Object>> listarTiposTecnologia(Integer idRuta, Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_ObtenerTipoTecnologia ?", idRuta);
    }

    public List<Map<String, Object>> listarTipoMaterial(Integer idTipoServicio) {
        return listarTipoMaterial(idTipoServicio, null);
    }

    public List<Map<String, Object>> listarTipoMaterial(Integer idTipoServicio, Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC sp_ObtenerTipoMaterial ?", idTipoServicio);
    }

    public List<Map<String, Object>> listarProductos() {
        return listarProductos(null);
    }

    public List<Map<String, Object>> listarProductos(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC TraerTodosLosProductos");
    }

    public List<Map<String, Object>> listarProductosSinFungibleWeb() {
        return listarProductosSinFungibleWeb(null);
    }

    public List<Map<String, Object>> listarProductosSinFungibleWeb(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC TraerTodosLosProductos_SinFungibleWeb");
    }

    public List<Map<String, Object>> listarProductosPorRuta(Integer idRuta) {
        return listarProductosPorRuta(idRuta, null);
    }

    public List<Map<String, Object>> listarProductosPorRuta(Integer idRuta, Integer idSucursal) {
        JdbcTemplate target = template(idSucursal);
        List<Map<String, Object>> rows = target.queryForList("EXEC TraerTodosLosProductos_x_IdRutaWeb ?", idRuta);
        if ((rows == null || rows.isEmpty()) && idSucursal != null) {
            try {
                List<Map<String, Object>> fallback = jdbcTemplate.queryForList("EXEC TraerTodosLosProductos_x_IdRutaWeb ?", idRuta);
                if (fallback != null && !fallback.isEmpty()) {
                    logger.warn(
                            "TraerTodosLosProductos_x_IdRutaWeb vacio en sucursal id={} para rutaId={}. Usando fallback DB principal.",
                            idSucursal,
                            idRuta
                    );
                    return fallback;
                }
            } catch (DataAccessException ex) {
                logger.warn(
                        "Fallback DB principal fallo para TraerTodosLosProductos_x_IdRutaWeb idSucursal={} rutaId={}: {}",
                        idSucursal,
                        idRuta,
                        ex.getMessage()
                );
            }
        }
        return rows;
    }

    public List<Map<String, Object>> listarProductosCargoUsuarioWeb() {
        return listarProductosCargoUsuarioWeb(null);
    }

    public List<Map<String, Object>> listarProductosCargoUsuarioWeb(Integer idSucursal) {
        JdbcTemplate target = template(idSucursal);
        try {
            return target.queryForList("EXEC TraerTodosLosProductos_SinFungibleWeb");
        } catch (DataAccessException ex) {
            // Compatibilidad: si el SP nuevo no existe en alguna sucursal, usar el anterior.
            return target.queryForList("EXEC spx_ObtenerProductosPCargoUsuario");
        }
    }

    public List<Map<String, Object>> buscarSerialCargoUsuario(String serial, String chipId, Integer tipoCodigo) {
        return buscarSerialCargoUsuario(serial, chipId, tipoCodigo, null);
    }

    public List<Map<String, Object>> buscarSerialCargoUsuario(String serial, String chipId, Integer tipoCodigo, Integer idSucursal) {
        return template(idSucursal).queryForList(
                "EXEC spx_BuscarSerialCargoUsuario ?, ?, ?",
                serial,
                chipId,
                tipoCodigo
        );
    }

    public List<Map<String, Object>> traerChipIdPorSerie(String serie) {
        return traerChipIdPorSerie(serie, null);
    }

    public List<Map<String, Object>> traerChipIdPorSerie(String serie, Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_TraerChipID2 ?", serie);
    }

    public List<Map<String, Object>> sugerirSeriesPorPrefijo(String prefijo, Integer limite, Integer idSucursal) {
        int top = (limite == null || limite <= 0) ? 10 : Math.min(limite, 30);
        String likeValue = (prefijo == null ? "" : prefijo.trim()) + "%";
        return template(idSucursal).queryForList(
                "SELECT TOP " + top + " " +
                        "LTRIM(RTRIM(ISNULL(p.Serial, ''))) AS serial, " +
                        "LTRIM(RTRIM(ISNULL(p.ChipID, ''))) AS chipId, " +
                        "p.id_producto AS idProducto " +
                        "FROM dbo.tbl_productos p " +
                        "WHERE ISNULL(p.e_eliminado, 0) = 0 " +
                        "AND LTRIM(RTRIM(ISNULL(p.Serial, ''))) <> '' " +
                        "AND UPPER(LTRIM(RTRIM(ISNULL(p.Serial, '')))) LIKE UPPER(?) " +
                        "ORDER BY p.id_producto DESC",
                likeValue
        );
    }

    public Map<String, Object> validarSerieChipUnico(String serie, String chipId) {
        return validarSerieChipUnico(serie, chipId, null);
    }

    public Map<String, Object> validarSerieChipUnico(String serie, String chipId, Integer idSucursal) {
        List<Map<String, Object>> rows = template(idSucursal).queryForList(
                "SELECT TOP 1 serial, chipid, id_producto, e_eliminado " +
                        "FROM dbo.tbl_productos " +
                        "WHERE (serial = ? OR chipid = ?) AND e_eliminado = 0",
                serie,
                chipId
        );
        if (rows.isEmpty()) {
            return buildSerieChipResult(false, false, false, serie, chipId);
        }

        Map<String, Object> row = rows.get(0);
        String serieDb = normalizeText(asString(row.get("serial")));
        String chipDb = normalizeText(asString(row.get("chipid")));
        String serieInput = normalizeText(serie);
        String chipInput = normalizeText(chipId);
        boolean serieExiste = !serieDb.isEmpty() && serieDb.equals(serieInput);
        boolean chipExiste = !chipDb.isEmpty() && chipDb.equals(chipInput);
        boolean mismoRegistro = serieExiste && chipExiste;
        return buildSerieChipResult(serieExiste, chipExiste, mismoRegistro, serie, chipId);
    }

    public List<Map<String, Object>> validarSerieSaldo(String serie, Integer idProducto, Integer tipoMaterial, Integer idRuta) {
        return validarSerieSaldo(serie, idProducto, tipoMaterial, idRuta, null);
    }

    public List<Map<String, Object>> validarSerieSaldo(String serie, Integer idProducto, Integer tipoMaterial, Integer idRuta, Integer idSucursal) {
        return template(idSucursal).execute((ConnectionCallback<List<Map<String, Object>>>) connection -> {
            try (CallableStatement statement = connection.prepareCall("{call spx_TraerDatoSerieChipIdCU_OT(?, ?, ?, ?)}")) {
                statement.setString(1, serie);
                statement.setInt(2, idProducto);
                statement.setInt(3, tipoMaterial);
                statement.setInt(4, idRuta);
                return readFirstResultSet(statement);
            }
        });
    }

    public List<Map<String, Object>> traerDatoSerieChipIdCU(String serie) {
        return traerDatoSerieChipIdCU(serie, null);
    }

    public List<Map<String, Object>> traerDatoSerieChipIdCU(String serie, Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_TraerDatoSerieChipIdCU ?", serie);
    }

    public List<Map<String, Object>> traerDatoSerieChipIdCUCUNR2(String serie, String chipId) {
        return traerDatoSerieChipIdCUCUNR2(serie, chipId, null);
    }

    public List<Map<String, Object>> traerDatoSerieChipIdCUCUNR2(String serie, String chipId, Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC spx_TraerDatoSerieChipIdCU_CUNR2 ?, ?", serie, chipId);
    }

    public List<Map<String, Object>> listarProductosMascara() {
        return listarProductosMascara(null);
    }

    public List<Map<String, Object>> listarProductosMascara(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC sp_TraerTodosLosProductosMascara");
    }

    public List<Map<String, Object>> listarKitsDecodificadores() {
        return listarKitsDecodificadores(null);
    }

    public List<Map<String, Object>> listarKitsDecodificadores(Integer idSucursal) {
        return template(idSucursal).queryForList("EXEC sp_ObtenerKitDecodificadores");
    }

    private JdbcTemplate template(Integer idSucursal) {
        return dbSupport.resolveTemplate(idSucursal, jdbcTemplate);
    }

    private Map<String, Object> buildSerieChipResult(
            boolean serieExiste,
            boolean chipExiste,
            boolean mismoRegistro,
            String serie,
            String chipId) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("serie", serie);
        result.put("chipId", chipId);
        result.put("serieExiste", serieExiste);
        result.put("chipExiste", chipExiste);
        result.put("mismoRegistro", mismoRegistro);
        result.put("sePuede", mismoRegistro);
        if (mismoRegistro) {
            result.put("observacion", "Serie y ChipID coinciden correctamente.");
        } else if (!serieExiste && chipExiste) {
            result.put("observacion", "La serie no existe, pero el ChipID ya esta registrado.");
        } else if (serieExiste && !chipExiste) {
            result.put("observacion", "La serie ya existe, pero el ChipID no coincide o no existe.");
        } else if (serieExiste) {
            result.put("observacion", "La serie y el ChipID existen, pero no corresponden al mismo registro.");
        } else {
            result.put("observacion", "La serie y el ChipID no existen en saldo.");
        }
        return result;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private List<Map<String, Object>> readFirstResultSet(CallableStatement statement) throws SQLException {
        boolean hasResults = statement.execute();
        while (!hasResults && statement.getUpdateCount() != -1) {
            hasResults = statement.getMoreResults();
        }
        if (!hasResults) {
            return Collections.emptyList();
        }
        try (ResultSet resultSet = statement.getResultSet()) {
            if (resultSet == null) {
                return Collections.emptyList();
            }
            ColumnMapRowMapper mapper = new ColumnMapRowMapper();
            List<Map<String, Object>> rows = new ArrayList<>();
            int rowNum = 0;
            while (resultSet.next()) {
                rows.add(mapper.mapRow(resultSet, rowNum++));
            }
            return rows;
        }
    }
}

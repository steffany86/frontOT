package com.example.TigoStarSystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.security.Security;
import java.util.ArrayList;
import java.util.List;

@SpringBootApplication
public class TigoStarSystemApplication {
	private static final String LEGACY_TLS_PROTOCOL = "TLSv1";

	static {
		habilitarTlsLegacySqlServer2008();
	}

	public static void main(String[] args) {
		SpringApplication.run(TigoStarSystemApplication.class, args);
	}

	/**
	 * SQL Server 2008 puede negociar TLSv1.
	 * En Java modernos TLSv1 suele venir deshabilitado por seguridad, por lo que
	 * solo lo removemos de la lista de algoritmos deshabilitados para permitir
	 * negociacion automatica del mejor protocolo soportado por cada servidor.
	 */
	private static void habilitarTlsLegacySqlServer2008() {
		String disabledAlgorithms = Security.getProperty("jdk.tls.disabledAlgorithms");
		if (disabledAlgorithms == null || disabledAlgorithms.trim().isEmpty()) {
			return;
		}

		String actualizado = removerAlgoritmo(disabledAlgorithms, LEGACY_TLS_PROTOCOL);
		Security.setProperty("jdk.tls.disabledAlgorithms", actualizado);
		System.setProperty("jdk.tls.disabledAlgorithms", actualizado);
	}

	private static String removerAlgoritmo(String csv, String objetivo) {
		String[] tokens = csv.split(",");
		List<String> out = new ArrayList<>();
		for (String token : tokens) {
			String trimmed = token == null ? "" : token.trim();
			if (trimmed.isEmpty()) {
				continue;
			}
			if (trimmed.equalsIgnoreCase(objetivo)) {
				continue;
			}
			out.add(trimmed);
		}
		return String.join(", ", out);
	}
}

use rayon::prelude::*;
use sgf_parse::go;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let mut sgf_folder = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut paths = Vec::new();

    println!("Loading SGF files...");
    for entry in jwalk::WalkDir::new(&sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().is_some_and(|ext| ext == "sgf") {
            paths.push(path.clone());
        }
    }
    println!("Found {} SGF files", paths.len());

    let total_files = AtomicUsize::new(0);
    let files_with_ha = AtomicUsize::new(0);
    let files_with_ff = AtomicUsize::new(0);
    let files_with_gm = AtomicUsize::new(0);
    let files_with_gn = AtomicUsize::new(0);

    // Collect all properties found in parallel
    let properties_vec: Vec<_> = paths
        .par_iter()
        .filter_map(|path| {
            total_files.fetch_add(1, Ordering::Relaxed);

            if let Ok(file_data) = std::fs::read_to_string(path) {
                if let Ok(game) = go::parse(&file_data) {
                    let mut ha = None;
                    let mut ff = None;
                    let mut gm = None;
                    let mut gn = None;

                    // Look for properties in the root node
                    for prop in &game[0].properties {
                        match prop {
                            go::Prop::HA(h) => {
                                files_with_ha.fetch_add(1, Ordering::Relaxed);
                                ha = Some(h.to_string());
                            }
                            go::Prop::FF(f) => {
                                files_with_ff.fetch_add(1, Ordering::Relaxed);
                                ff = Some(f.to_string());
                            }
                            go::Prop::GM(g) => {
                                files_with_gm.fetch_add(1, Ordering::Relaxed);
                                gm = Some(g.to_string());
                            }
                            go::Prop::GN(g) => {
                                files_with_gn.fetch_add(1, Ordering::Relaxed);
                                gn = Some(g.text.to_string());
                            }
                            _ => {}
                        }
                    }

                    if ha.is_some() || ff.is_some() || gm.is_some() || gn.is_some() {
                        let relative_path = path
                            .strip_prefix(&sgf_folder)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .into_owned();
                        return Some((relative_path, ha, ff, gm, gn));
                    }
                }
            }
            None
        })
        .collect();

    // Count occurrences of each property value
    let mut ha_counts = HashMap::new();
    let mut ff_counts = HashMap::new();
    let mut gm_counts = HashMap::new();
    let mut gn_counts = HashMap::new();

    for (_, ha, ff, gm, gn) in &properties_vec {
        if let Some(ha_val) = ha {
            *ha_counts.entry(ha_val.clone()).or_insert(0) += 1;
        }
        if let Some(ff_val) = ff {
            *ff_counts.entry(ff_val.clone()).or_insert(0) += 1;
        }
        if let Some(gm_val) = gm {
            *gm_counts.entry(gm_val.clone()).or_insert(0) += 1;
        }
        if let Some(gn_val) = gn {
            *gn_counts.entry(gn_val.clone()).or_insert(0) += 1;
        }
    }

    println!("\n=== SUMMARY ===");
    println!(
        "Total SGF files processed: {}",
        total_files.load(Ordering::Relaxed)
    );
    println!(
        "Files with HA property: {}",
        files_with_ha.load(Ordering::Relaxed)
    );
    println!(
        "Files with FF property: {}",
        files_with_ff.load(Ordering::Relaxed)
    );
    println!(
        "Files with GM property: {}",
        files_with_gm.load(Ordering::Relaxed)
    );
    println!(
        "Files with GN property: {}",
        files_with_gn.load(Ordering::Relaxed)
    );

    if !ha_counts.is_empty() {
        println!("\n=== HA (HANDICAP) VALUES WITH COUNTS ===");
        let mut sorted_ha: Vec<_> = ha_counts.into_iter().collect();
        sorted_ha.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        for (value, count) in sorted_ha {
            println!("'{value}': {count} occurrences");
        }
    }

    if !ff_counts.is_empty() {
        println!("\n=== FF (FILE FORMAT) VALUES WITH COUNTS ===");
        let mut sorted_ff: Vec<_> = ff_counts.into_iter().collect();
        sorted_ff.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        for (value, count) in sorted_ff {
            println!("'{value}': {count} occurrences");
        }
    }

    if !gm_counts.is_empty() {
        println!("\n=== GM (GAME TYPE) VALUES WITH COUNTS ===");
        let mut sorted_gm: Vec<_> = gm_counts.into_iter().collect();
        sorted_gm.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        for (value, count) in sorted_gm {
            println!("'{value}': {count} occurrences");
        }
    }

    if !gn_counts.is_empty() {
        println!("\n=== GN (GAME NAME) VALUES WITH COUNTS ===");
        let mut sorted_gn: Vec<_> = gn_counts.into_iter().collect();
        sorted_gn.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        for (value, count) in sorted_gn {
            println!("'{value}': {count} occurrences");
        }
    }

    println!("\n=== FIRST 20 EXAMPLES ===");
    for (i, (file_path, ha, ff, gm, gn)) in properties_vec.iter().take(20).enumerate() {
        println!("{}. {}", i + 1, file_path);
        if let Some(ha_val) = ha {
            println!("   HA[{ha_val}]");
        }
        if let Some(ff_val) = ff {
            println!("   FF[{ff_val}]");
        }
        if let Some(gm_val) = gm {
            println!("   GM[{gm_val}]");
        }
        if let Some(gn_val) = gn {
            println!("   GN[{gn_val}]");
        }
    }

    if properties_vec.len() > 20 {
        println!(
            "... and {} more files with these properties",
            properties_vec.len() - 20
        );
    }
}

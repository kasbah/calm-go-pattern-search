use calm_go_patterns_common::baduk::parse_komi;
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
    let files_with_km_property = AtomicUsize::new(0);
    let files_with_bad_komi = AtomicUsize::new(0);

    // Collect all problematic komi values found in parallel
    let bad_komi_vec: Vec<_> = paths
        .par_iter()
        .filter_map(|path| {
            total_files.fetch_add(1, Ordering::Relaxed);

            if let Ok(file_data) = std::fs::read_to_string(path) {
                if let Ok(game) = go::parse(&file_data) {
                    // Look for KM property in the root node
                    for prop in &game[0].properties {
                        if let go::Prop::KM(km) = prop {
                            files_with_km_property.fetch_add(1, Ordering::Relaxed);
                            let komi_str = km.to_string();

                            // Use parse_komi function - if it returns None, it's a bad komi
                            if parse_komi(&komi_str).is_none() {
                                // Bad komi found
                                files_with_bad_komi.fetch_add(1, Ordering::Relaxed);
                                let relative_path = path
                                    .strip_prefix(&sgf_folder)
                                    .unwrap_or(path)
                                    .to_string_lossy()
                                    .into_owned();
                                return Some((relative_path, komi_str.clone()));
                            }
                        }
                    }
                }
            }
            None
        })
        .collect();

    // Count occurrences of each bad komi value
    let mut komi_counts = HashMap::new();
    for (_, bad_komi) in &bad_komi_vec {
        *komi_counts.entry(bad_komi.clone()).or_insert(0) += 1;
    }

    println!("\n=== SUMMARY ===");
    println!(
        "Total SGF files processed: {}",
        total_files.load(Ordering::Relaxed)
    );
    println!(
        "Files with KM property: {}",
        files_with_km_property.load(Ordering::Relaxed)
    );
    println!(
        "Files with bad komi values: {}",
        files_with_bad_komi.load(Ordering::Relaxed)
    );
    println!("Unique bad komi values: {}", komi_counts.len());

    if !bad_komi_vec.is_empty() {
        println!("\n=== BAD KOMI VALUES WITH COUNTS ===");
        let mut sorted_komi: Vec<_> = komi_counts.into_iter().collect();
        sorted_komi.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0))); // Sort by count descending, then by komi value ascending

        for (komi_value, count) in sorted_komi {
            println!("'{komi_value}': {count} occurrences");
        }

        println!("\n=== FIRST 20 EXAMPLES ===");
        for (i, (file_path, komi_value)) in bad_komi_vec.iter().take(20).enumerate() {
            println!("{}. {}: KM[{}]", i + 1, file_path, komi_value);
        }

        if bad_komi_vec.len() > 20 {
            println!(
                "... and {} more files with bad komi values",
                bad_komi_vec.len() - 20
            );
        }
    } else {
        println!("\n🎉 No bad komi values found! All komi properties parse correctly to f32.");
    }
}

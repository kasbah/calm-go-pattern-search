use calm_go_patterns_common::baduk::{Rules, parse_rules};
use rayon::prelude::*;
use sgf_parse::go;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
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
    let files_with_ru_property = AtomicUsize::new(0);
    let files_with_parsed_rules = AtomicUsize::new(0);

    // Collect all rules found in parallel
    let rules_vec: Vec<_> = paths
        .par_iter()
        .filter_map(|path| {
            total_files.fetch_add(1, Ordering::Relaxed);

            if let Ok(file_data) = std::fs::read_to_string(path) {
                if let Ok(game) = go::parse(&file_data) {
                    // Look for RU property in the root node
                    for prop in &game[0].properties {
                        if let go::Prop::RU(ru) = prop {
                            files_with_ru_property.fetch_add(1, Ordering::Relaxed);
                            let rules = parse_rules(&ru.text);
                            files_with_parsed_rules.fetch_add(1, Ordering::Relaxed);
                            return Some(rules);
                        }
                    }
                }
            }
            None
        })
        .collect();

    // Count occurrences of each rule type
    let mut rule_counts = HashMap::new();
    for rule in rules_vec {
        let rule_key = match rule {
            Rules::Chinese => "Chinese".to_string(),
            Rules::Japanese => "Japanese".to_string(),
            Rules::Korean => "Korean".to_string(),
            Rules::Ing => "Ing".to_string(),
            Rules::Custom(custom_rule) => format!("Custom: '{custom_rule}'"),
        };
        *rule_counts.entry(rule_key).or_insert(0) += 1;
    }

    println!("\n=== SUMMARY ===");
    println!(
        "Total SGF files processed: {}",
        total_files.load(Ordering::Relaxed)
    );
    println!(
        "Files with RU property: {}",
        files_with_ru_property.load(Ordering::Relaxed)
    );
    println!("Unique rule types found: {}", rule_counts.len());

    println!("\n=== RULE TYPES WITH COUNTS ===");
    let mut sorted_rules: Vec<_> = rule_counts.into_iter().collect();
    sorted_rules.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0))); // Sort by count descending, then by rule name ascending

    for (rule, count) in sorted_rules {
        println!("{rule}: {count} occurrences");
    }
}

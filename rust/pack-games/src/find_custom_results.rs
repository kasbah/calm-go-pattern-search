use calm_go_patterns_common::baduk::{Color, GameResult, Score, parse_sgf_result};
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
    let files_with_re_property = AtomicUsize::new(0);
    let files_with_parsed_results = AtomicUsize::new(0);

    // Collect all results found in parallel
    let results_vec: Vec<_> = paths
        .par_iter()
        .filter_map(|path| {
            total_files.fetch_add(1, Ordering::Relaxed);

            if let Ok(file_data) = std::fs::read_to_string(path) {
                if let Ok(game) = go::parse(&file_data) {
                    // Look for RE property in the root node
                    for prop in &game[0].properties {
                        if let go::Prop::RE(re) = prop {
                            files_with_re_property.fetch_add(1, Ordering::Relaxed);
                            let result = parse_sgf_result(&re.text);
                            match result {
                                GameResult::Unknown(_) => {}
                                _ => {
                                    files_with_parsed_results.fetch_add(1, Ordering::Relaxed);
                                }
                            }
                            return Some((re.text.clone(), result));
                        }
                    }
                }
            }
            None
        })
        .collect();

    // Count occurrences of each result type in parallel
    let (result_counts, unparsed_results) = results_vec
        .par_iter()
        .fold(
            || (HashMap::new(), HashMap::new()),
            |(mut result_counts, mut unparsed_results), (original_text, parsed_result)| {
                match parsed_result {
                    GameResult::Player(Color::Black, Some(Score::Resignation), _) => {
                        *result_counts
                            .entry("B+Resignation".to_string())
                            .or_insert(0) += 1;
                    }
                    GameResult::Player(Color::White, Some(Score::Resignation), _) => {
                        *result_counts
                            .entry("W+Resignation".to_string())
                            .or_insert(0) += 1;
                    }
                    GameResult::Player(Color::Black, Some(Score::Timeout), _) => {
                        *result_counts.entry("B+Timeout".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::White, Some(Score::Timeout), _) => {
                        *result_counts.entry("W+Timeout".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::Black, Some(Score::Forfeit), _) => {
                        *result_counts.entry("B+Forfeit".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::White, Some(Score::Forfeit), _) => {
                        *result_counts.entry("W+Forfeit".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::Black, Some(Score::Points(_)), _) => {
                        *result_counts.entry("B+Points".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::White, Some(Score::Points(_)), _) => {
                        *result_counts.entry("W+Points".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::Black, None, _) => {
                        *result_counts.entry("B+NoScore".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Player(Color::White, None, _) => {
                        *result_counts.entry("W+NoScore".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Draw => {
                        *result_counts.entry("Draw".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Void => {
                        *result_counts.entry("Void".to_string()).or_insert(0) += 1;
                    }
                    GameResult::Unknown(_) => {
                        // This is a custom/unparsed result
                        *unparsed_results.entry(original_text.clone()).or_insert(0) += 1;
                    }
                }
                (result_counts, unparsed_results)
            },
        )
        .reduce(
            || (HashMap::new(), HashMap::new()),
            |(mut acc_results, mut acc_unparsed), (thread_results, thread_unparsed)| {
                // Merge result_counts
                for (key, count) in thread_results {
                    *acc_results.entry(key).or_insert(0) += count;
                }
                // Merge unparsed_results
                for (key, count) in thread_unparsed {
                    *acc_unparsed.entry(key).or_insert(0) += count;
                }
                (acc_results, acc_unparsed)
            },
        );

    println!("\n=== SUMMARY ===");
    println!(
        "Total SGF files processed: {}",
        total_files.load(Ordering::Relaxed)
    );
    println!(
        "Files with RE property: {}",
        files_with_re_property.load(Ordering::Relaxed)
    );
    println!(
        "Files with parsed results: {}",
        files_with_parsed_results.load(Ordering::Relaxed)
    );
    println!("Unique parsed result types found: {}", result_counts.len());
    println!(
        "Unique custom/unparsed results found: {}",
        unparsed_results.len()
    );

    if !unparsed_results.is_empty() {
        println!("\n=== CUSTOM/UNPARSED RESULTS WITH COUNTS ===");
        let mut sorted_unparsed: Vec<_> = unparsed_results.into_iter().collect();
        sorted_unparsed.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0))); // Sort by count descending, then by result ascending

        for (result, count) in sorted_unparsed {
            println!("'{result}': {count} occurrences");
        }
    }

    println!("\n=== ALL RESULT TYPES WITH COUNTS ===");
    let mut sorted_results: Vec<_> = result_counts.into_iter().collect();
    sorted_results.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0))); // Sort by count descending, then by result name ascending

    for (result, count) in sorted_results {
        println!("{result}: {count} occurrences");
    }
}

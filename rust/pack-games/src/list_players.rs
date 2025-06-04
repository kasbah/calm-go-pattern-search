use calm_go_patterns_common::baduk::unpack_games;
use rayon::prelude::*;
use std::collections::HashSet;
use std::fs::File;
use std::io::Write;

fn main() {
    let games = unpack_games(&std::fs::read("games.pack").expect("Failed to read games.pack"));

    let player_names: HashSet<String> = games
        .par_iter()
        .flat_map(|(_, game)| vec![game.player_black.clone(), game.player_white.clone()])
        .map(|name| name.replace(['\n', '\r'], "").trim().to_string())
        .filter(|name| {
            !name.is_empty()
                && name != "?"
                && !name.contains('&')
                && !name.contains(',')
                && !name.to_lowercase().contains(" and ")
        })
        .collect();

    let mut sorted_names: Vec<_> = player_names.into_iter().collect();
    sorted_names.sort();

    println!(
        "Found {} unique players (excluding blank names, '?', names with '&', ',', or 'and'):",
        sorted_names.len()
    );

    // Save to file
    let mut file = File::create("player_names.txt").expect("Failed to create file");
    for name in &sorted_names {
        writeln!(file, "{}", name).expect("Failed to write to file");
        println!("{}", name);
    }

    println!("\nPlayer names have been saved to player_names.txt");
}

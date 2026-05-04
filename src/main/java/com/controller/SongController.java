package com.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dao.SongRepository;
import com.entity.Song;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.SongService;

@RestController
@RequestMapping("/songs")
public class SongController {

    @Autowired
    private SongService songService;

    @Autowired
    private SongRepository songRepo;

    private static final String UPLOAD_DIR =
        System.getProperty("user.dir") + File.separator + "uploads" + File.separator;

    // ✅ 1. Add a new song with optional audio file
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Song> addSong(
        @RequestParam("song") String songJson,
        @RequestParam(value = "file", required = false) MultipartFile file
    ) throws Exception {

        ObjectMapper mapper = new ObjectMapper();
        Song song = mapper.readValue(songJson, Song.class);

        if (file != null && !file.isEmpty()) {
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            File destFile = new File(uploadDir, fileName);
            file.transferTo(destFile);
            song.setFilePath(fileName);
        }

        return ResponseEntity.ok(songRepo.save(song));
    }

    // ✅ 2. Stream audio file to browser
    @GetMapping("/audio/{fileName:.+}")
    public ResponseEntity<Resource> streamAudio(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR + fileName);
            Resource resource = new FileSystemResource(filePath);

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = "audio/mpeg";

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + fileName + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ 3. Get all songs
    @GetMapping
    public List<Song> getAllSongs() {
        return songService.getAllSongs();
    }

    // ✅ 4. Recommend by genre
    @GetMapping("/recommend/genre/{genre}")
    public List<Song> recommendByGenre(@PathVariable String genre) {
        return songService.getSongsByGenre(genre);
    }

    // ✅ 5. Recommend by mood
    @GetMapping("/recommend/mood/{mood}")
    public List<Song> recommendByMood(@PathVariable String mood) {
        return songService.getSongsByMood(mood);
    }

    // ✅ 6. Random song
    @GetMapping("/recommend/random")
    public Song recommendRandomSong() {
        return songService.getRandomSong();
    }
}
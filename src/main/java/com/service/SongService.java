package com.service;

import java.util.List;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.dao.SongRepository;
import com.entity.Song;

@Service
public class SongService {
	 @Autowired
	    private SongRepository songRepository;
	
	    public Song addSong(Song song) { 
	    	return songRepository.save(song);
	    }
	    public List<Song> getAllSongs() { 
	    	 return songRepository.findAll();
	    }
	    public List<Song> getSongsByGenre(String genre) {
	    	return songRepository.findByGenre(genre);
	    }
	    public List<Song> getSongsByMood(String mood) { 
	    	return songRepository.findByMood(mood);
	    }
	    public Song getRandomSong() { 
	    	List<Song> songs = songRepository.findAll();
	        if (songs.isEmpty()) {
	            return null; 
	        }
	        Random random = new Random();
	        return songs.get(random.nextInt(songs.size()));
	    }
	    }
	



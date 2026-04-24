'use client';

import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, DocumentReference } from 'firebase/firestore';
import { storage, db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';

interface FileMetadata {
  file: File;
  name: string;
  genre: string;
  type: 'loop' | 'one-shot';
  key: string;
  bpm: string;
  emotions: string[];
  instrument?: string;
}

const GENRE_OPTIONS = ['Electronic', 'Hip-Hop', 'Ambient', 'Techno', 'House', 'Experimental', 'Pop', 'Other'];
const EMOTION_OPTIONS = ['Dark', 'Bright', 'Energetic', 'Calm', 'Aggressive', 'Peaceful', 'Uplifting', 'Melancholic'];
const KEY_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INSTRUMENT_OPTIONS = [
  'Sample', 'Synthesizer', 'Keys and Piano', 'Noise', 'Drums', 'Percussion', 'Bass', 'Guitar', 'Strings', 'Brass', 'Woodwinds', 'Vocal', 'FX', 'Pluck', 'Pad', 'Lead', 'Arp', 'Bell', 'Mallet', 'Organ', 'Accordion', 'Flute', 'Saxophone', 'Trumpet', 'Violin', 'Cello', 'Clarinet', 'Oboe', 'Harp', 'Kalimba', 'Steel Drum', '808', 'Kick', 'Snare', 'Hi-Hat', 'Clap', 'Rim', 'Tom', 'Cymbal', 'Shaker', 'Tambourine', 'Other'
];

export default function Upload() {
  const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [packName, setPackName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [newPackId, setNewPackId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newMetadata: FileMetadata[] = [];
      for (let i = 0; i < files.length; i++) {
        newMetadata.push({
          file: files[i],
          name: files[i].name.replace(/\.[^/.]+$/, ''),
          genre: '',
          type: 'one-shot',
          key: '',
          bpm: '',
          emotions: [],
          instrument: '',
        });
      }
      setFileMetadata(prev => [...prev, ...newMetadata]);
    }
  };

  const updateFileMetadata = (index: number, field: keyof FileMetadata, value: any) => {
    const updated = [...fileMetadata];
    updated[index] = { ...updated[index], [field]: value };
    setFileMetadata(updated);
  };

  const toggleEmotion = (index: number, emotion: string) => {
    const updated = [...fileMetadata];
    const emotions = updated[index].emotions;
    if (emotions.includes(emotion)) {
      emotions.splice(emotions.indexOf(emotion), 1);
    } else {
      emotions.push(emotion);
    }
    setFileMetadata(updated);
  };

  const removeFile = (index: number) => {
    setFileMetadata(fileMetadata.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileMetadata.length === 0 || !user) return;

    setUploading(true);
    try {
      const uploadedFiles: any[] = [];
      let coverImageUrl = '';

      // Upload cover image if provided
      if (coverImage) {
        const imageRef = ref(storage, `packs/${user.uid}/${Date.now()}_cover_${coverImage.name}`);
        await uploadBytes(imageRef, coverImage);
        coverImageUrl = await getDownloadURL(imageRef);
      }

      // Upload each audio file with metadata
      for (let i = 0; i < fileMetadata.length; i++) {
        const metadata = fileMetadata[i];
        const storageRef = ref(storage, `samples/${user.uid}/${Date.now()}_${metadata.file.name}`);
        await uploadBytes(storageRef, metadata.file);
        const downloadURL = await getDownloadURL(storageRef);
        uploadedFiles.push({
          name: metadata.name,
          url: downloadURL,
          genre: metadata.genre,
          type: metadata.type,
          key: metadata.key,
          bpm: metadata.type === 'loop' ? metadata.bpm : '',
          emotions: metadata.emotions,
          instrument: metadata.type === 'one-shot' ? metadata.instrument || '' : '',
        });
      }

      // Save pack metadata to Firestore
      const docRef: DocumentReference = await addDoc(collection(db, 'samplePacks'), {
        name: packName,
        description,
        files: uploadedFiles,
        coverImage: coverImageUrl,
        uploaderUid: user.uid,
        uploaderName: user.displayName,
        createdAt: new Date(),
        likes: [],
      });

      setNewPackId(docRef.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <main className="flex-1 py-8 px-6">
        <div className="text-center">Please log in to upload samples.</div>
      </main>
    );
  }

  if (newPackId) {
    return (
      <main className="flex-1 py-12 px-6 bg-black flex items-center justify-center min-h-[60vh]">
        <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 max-w-xl w-full text-center shadow-xl">
          <h1 className="text-4xl md:text-5xl font-bold text-orange-500 mb-6">Congratulations!</h1>
          <p className="text-lg text-gray-200 mb-8">Your sample pack has been uploaded successfully.</p>
          <a
            href={`/packs/${newPackId}`}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:shadow-lg hover:shadow-orange-500/50"
          >
            View Your Pack
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6 bg-black">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-12 text-white">Upload Samples</h1>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 space-y-8">
          {/* Pack Info */}
          <div className="space-y-6">
            <div>
              <label htmlFor="packName" className="block text-white mb-3 font-semibold">Pack Name</label>
              <input
                type="text"
                id="packName"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-700"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-white mb-3 font-semibold">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-700 h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-white mb-3 font-semibold">Pack Cover Image</label>
              <div className="flex w-full justify-center">
                <div className="relative">
                  <div className="w-44 h-44 rounded-2xl bg-gray-800 flex items-center justify-center border-2 border-gray-700 relative">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Cover preview" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                        <rect x="12" y="12" width="56" height="56" rx="16" fill="#23272b" />
                        <path d="M28 56L40 38L52 56" stroke="#888" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="33" cy="33" r="4" fill="#888" />
                      </svg>
                    )}
                    <input
                      type="file"
                      id="coverImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer rounded-2xl"
                      aria-label="Upload cover image"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div>
            <label className="block text-white mb-3 font-semibold">Select Audio Files</label>
            <div className="relative w-full flex items-center justify-center">
              <input
                type="file"
                id="files"
                multiple
                accept="audio/*"
                onChange={handleFilesChange}
                className="absolute inset-0 opacity-0 cursor-pointer rounded-2xl z-10"
                required
                aria-label="Upload audio files"
              />
              <label htmlFor="files" className="w-full flex items-center justify-center bg-gray-800 border-2 border-gray-700 hover:border-orange-500 text-orange-400 font-semibold py-8 rounded-2xl cursor-pointer transition-colors text-lg shadow-lg">
                Click or drag to upload audio files
              </label>
            </div>
          </div>

          {/* File Metadata Editor */}
          {fileMetadata.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-gray-700">
              <h2 className="text-2xl font-bold text-white">Sample Metadata</h2>
              {fileMetadata.map((metadata, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-orange-500">Sample {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-400 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </div>

                  {/* File Name */}
                  <div>
                    <label className="block text-white mb-2 font-semibold text-sm">File Name</label>
                    <input
                      type="text"
                      value={metadata.name}
                      onChange={(e) => updateFileMetadata(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 text-sm"
                    />
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="block text-white mb-2 font-semibold text-sm">Genre</label>
                    <select
                      value={metadata.genre}
                      onChange={(e) => updateFileMetadata(index, 'genre', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 text-sm"
                    >
                      <option value="">Select a genre...</option>
                      {GENRE_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sample Type */}
                  <div>
                    <label className="block text-white mb-2 font-semibold text-sm">Sample Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center text-white cursor-pointer">
                        <input
                          type="radio"
                          name={`type-${index}`}
                          value="loop"
                          checked={metadata.type === 'loop'}
                          onChange={() => updateFileMetadata(index, 'type', 'loop')}
                          className="mr-2"
                        />
                        Loop
                      </label>
                      <label className="flex items-center text-white cursor-pointer">
                        <input
                          type="radio"
                          name={`type-${index}`}
                          value="one-shot"
                          checked={metadata.type === 'one-shot'}
                          onChange={() => updateFileMetadata(index, 'type', 'one-shot')}
                          className="mr-2"
                        />
                        One-Shot
                      </label>
                    </div>
                  </div>

                  {/* Instrument (only for one-shots) */}
                  {metadata.type === 'one-shot' && (
                    <div>
                      <label className="block text-white mb-2 font-semibold text-sm">Instrument</label>
                      <select
                        value={metadata.instrument}
                        onChange={e => updateFileMetadata(index, 'instrument', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 text-sm"
                      >
                        <option value="">Select an instrument...</option>
                        {INSTRUMENT_OPTIONS.map(inst => (
                          <option key={inst} value={inst}>{inst}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Key */}
                  <div>
                    <label className="block text-white mb-2 font-semibold text-sm">Key</label>
                    <select
                      value={metadata.key}
                      onChange={(e) => updateFileMetadata(index, 'key', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 text-sm"
                    >
                      <option value="">Select a key...</option>
                      {KEY_OPTIONS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  {/* BPM (only for loops) */}
                  {metadata.type === 'loop' && (
                    <div>
                      <label className="block text-white mb-2 font-semibold text-sm">BPM</label>
                      <input
                        type="number"
                        value={metadata.bpm}
                        onChange={(e) => updateFileMetadata(index, 'bpm', e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 text-sm"
                      />
                    </div>
                  )}

                  {/* Emotions */}
                  <div>
                    <label className="block text-white mb-3 font-semibold text-sm">Emotional Tags</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EMOTION_OPTIONS.map(emotion => (
                        <button
                          key={emotion}
                          type="button"
                          onClick={() => toggleEmotion(index, emotion)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            metadata.emotions.includes(emotion)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {emotion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || fileMetadata.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : `Upload Pack (${fileMetadata.length} ${fileMetadata.length === 1 ? 'sample' : 'samples'})`}
          </button>
        </form>
      </div>
    </main>
  );
}
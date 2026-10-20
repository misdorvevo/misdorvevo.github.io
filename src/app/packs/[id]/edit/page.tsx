'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface PackFile {
  name: string;
  url: string;
}

interface SamplePack {
  id: string;
  name: string;
  description: string;
  files: PackFile[];
  coverImage?: string;
  uploaderUid: string;
  createdAt: Date;
  likes: string[];
}

export default function EditPack() {
  const params = useParams();
  const router = useRouter();
  const packId = params.id as string;
  
  const [pack, setPack] = useState<SamplePack | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  // Fetch pack data
  useEffect(() => {
    if (!packId || !currentUserId) return;

    const fetchPack = async () => {
      try {
        const packRef = doc(db, 'samplePacks', packId);
        const packSnap = await getDoc(packRef);

        if (packSnap.exists()) {
          const packData = {
            id: packSnap.id,
            ...packSnap.data(),
            createdAt: packSnap.data().createdAt.toDate(),
          } as SamplePack;

          // Check if user is the creator
          if (packData.uploaderUid !== currentUserId) {
            router.push(`/packs/${packId}`);
            return;
          }

          setPack(packData);
          setFormData({
            name: packData.name,
            description: packData.description,
          });
          if (packData.coverImage) {
            setCoverImagePreview(packData.coverImage);
          }
        }
      } catch (error) {
        console.error('Error fetching pack:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPack();
  }, [packId, currentUserId, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pack || !currentUserId) return;

    setSubmitting(true);
    try {
      let coverImageUrl = pack.coverImage;

      // Upload new cover image if provided
      if (coverImage) {
        const storageRef = ref(storage, `packs/${currentUserId}/${Date.now()}_cover_${coverImage.name}`);
        await uploadBytes(storageRef, coverImage);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      // Update pack
      const packRef = doc(db, 'samplePacks', packId);
      await updateDoc(packRef, {
        name: formData.name,
        description: formData.description,
        ...(coverImage && { coverImage: coverImageUrl }),
      });

      router.push(`/packs/${packId}`);
    } catch (error) {
      console.error('Error updating pack:', error);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/packs/${packId}`} className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
            ← Back to Pack
          </Link>
          <div className="text-center text-gray-400">Loading pack...</div>
        </div>
      </main>
    );
  }

  if (!pack) {
    return (
      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/packs" className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
            ← Back to Packs
          </Link>
          <div className="text-center text-gray-400">Pack not found.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href={`/packs/${packId}`} className="text-brand-500 hover:text-brand-400 transition-colors mb-6 inline-block">
          ← Back to Pack
        </Link>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h1 className="text-4xl font-bold text-white mb-8">Edit Pack</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Image */}
            <div>
              <label className="block text-white font-semibold mb-3">Cover Image</label>
              <div className="mb-4">
                <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center overflow-hidden">
                  {coverImagePreview ? (
                    <img 
                      src={coverImagePreview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500">No image selected</span>
                  )}
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-brand-500 focus:outline-none"
              />
              <p className="text-gray-400 text-sm mt-2">Upload a new image to replace the current one</p>
            </div>

            {/* Pack Name */}
            <div>
              <label htmlFor="name" className="block text-white font-semibold mb-3">
                Pack Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
                placeholder="Enter pack name"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-white font-semibold mb-3">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none resize-none"
                placeholder="Enter pack description"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href={`/packs/${packId}`} className="flex-1">
                <button
                  type="button"
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
